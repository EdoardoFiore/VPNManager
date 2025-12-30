"""
MADMIN Iptables Manager

Low-level wrapper for iptables commands.
Handles chain creation, rule application, and command execution.
"""
import subprocess
import logging
import re
from typing import List, Optional, Tuple
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Chain name constants
MADMIN_INPUT_CHAIN = "MADMIN_INPUT"
MADMIN_OUTPUT_CHAIN = "MADMIN_OUTPUT"
MADMIN_FORWARD_CHAIN = "MADMIN_FORWARD"

# Mapping from logical chain names to MADMIN chains
CHAIN_MAP = {
    "INPUT": MADMIN_INPUT_CHAIN,
    "OUTPUT": MADMIN_OUTPUT_CHAIN,
    "FORWARD": MADMIN_FORWARD_CHAIN,
}


def _run_iptables(table: str, args: List[str], suppress_errors: bool = False) -> Tuple[bool, str]:
    """
    Execute an iptables command.
    
    Args:
        table: iptables table (filter, nat, mangle)
        args: Command arguments (without 'iptables -t table')
        suppress_errors: If True, don't log errors
    
    Returns:
        Tuple of (success: bool, output: str)
    """
    if settings.mock_iptables:
        cmd_str = f"iptables -t {table} {' '.join(args)}"
        logger.debug(f"[MOCK] Would execute: {cmd_str}")
        return True, ""
    
    cmd = ["iptables", "-t", table] + args
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        if not suppress_errors:
            logger.error(f"iptables command failed: {' '.join(cmd)}")
            logger.error(f"Error: {e.stderr}")
        return False, e.stderr
    except FileNotFoundError:
        logger.error("iptables command not found")
        return False, "iptables not found"


def chain_exists(chain_name: str, table: str = "filter") -> bool:
    """Check if an iptables chain exists."""
    success, _ = _run_iptables(table, ["-L", chain_name, "-n"], suppress_errors=True)
    return success


def create_chain(chain_name: str, table: str = "filter") -> bool:
    """Create an iptables chain if it doesn't exist."""
    if chain_exists(chain_name, table):
        return True
    
    success, _ = _run_iptables(table, ["-N", chain_name])
    if success:
        logger.info(f"Created chain {chain_name} in table {table}")
    return success


def flush_chain(chain_name: str, table: str = "filter") -> bool:
    """Flush all rules from a chain."""
    success, _ = _run_iptables(table, ["-F", chain_name])
    if success:
        logger.debug(f"Flushed chain {chain_name}")
    return success


def delete_chain(chain_name: str, table: str = "filter") -> bool:
    """Delete an empty chain."""
    # First flush the chain
    flush_chain(chain_name, table)
    # Then delete it
    success, _ = _run_iptables(table, ["-X", chain_name], suppress_errors=True)
    return success


def create_or_flush_chain(chain_name: str, table: str = "filter") -> bool:
    """Create a chain if it doesn't exist, or flush it if it does."""
    if chain_exists(chain_name, table):
        return flush_chain(chain_name, table)
    else:
        return create_chain(chain_name, table)


def get_chain_rules(chain_name: str, table: str = "filter") -> List[str]:
    """Get all rules in a chain."""
    success, output = _run_iptables(table, ["-L", chain_name, "-n", "--line-numbers"])
    if not success:
        return []
    return output.strip().split("\n")


def ensure_jump_rule(
    source_chain: str, 
    target_chain: str, 
    table: str = "filter", 
    position: Optional[int] = None
) -> bool:
    """
    Ensure a jump rule exists from source_chain to target_chain.
    If position is specified, insert at that position (1-indexed).
    Otherwise, append to the chain.
    """
    # Check if jump already exists
    success, output = _run_iptables(table, ["-L", source_chain, "-n"])
    if success and target_chain in output:
        logger.debug(f"Jump to {target_chain} already exists in {source_chain}")
        return True
    
    # Add the jump rule
    if position is not None:
        args = ["-I", source_chain, str(position), "-j", target_chain]
    else:
        args = ["-A", source_chain, "-j", target_chain]
    
    success, _ = _run_iptables(table, args)
    if success:
        logger.info(f"Added jump from {source_chain} to {target_chain}")
    return success


def remove_jump_rule(source_chain: str, target_chain: str, table: str = "filter") -> bool:
    """Remove a jump rule from source_chain to target_chain."""
    success, _ = _run_iptables(table, ["-D", source_chain, "-j", target_chain], suppress_errors=True)
    return success


def build_rule_args(
    chain: str,
    action: str,
    protocol: Optional[str] = None,
    source: Optional[str] = None,
    destination: Optional[str] = None,
    port: Optional[str] = None,
    in_interface: Optional[str] = None,
    out_interface: Optional[str] = None,
    state: Optional[str] = None,
    comment: Optional[str] = None,
    operation: str = "-A"
) -> List[str]:
    """
    Build iptables command arguments for a rule.
    
    Args:
        chain: Target chain name
        action: Rule action (ACCEPT, DROP, REJECT, etc.)
        protocol: Protocol (tcp, udp, icmp, all)
        source: Source IP/CIDR
        destination: Destination IP/CIDR
        port: Port or port range (e.g., "80" or "80:443")
        in_interface: Input interface
        out_interface: Output interface
        state: Connection state (NEW, ESTABLISHED, etc.)
        comment: Rule comment
        operation: -A (append), -I (insert), -D (delete)
    
    Returns:
        List of command arguments
    """
    args = [operation, chain]
    
    if protocol:
        args.extend(["-p", protocol])
    
    if source:
        args.extend(["-s", source])
    
    if destination:
        args.extend(["-d", destination])
    
    if in_interface:
        args.extend(["-i", in_interface])
    
    if out_interface:
        args.extend(["-o", out_interface])
    
    if state:
        args.extend(["-m", "state", "--state", state])
    
    if port and protocol in ("tcp", "udp"):
        # Support both single port and range
        args.extend(["--dport", str(port)])
    
    if comment:
        # Sanitize comment for iptables
        safe_comment = re.sub(r'[^a-zA-Z0-9_\-\. ]', '', comment)[:255]
        args.extend(["-m", "comment", "--comment", safe_comment])
    
    args.extend(["-j", action])
    
    return args


def add_rule(
    table: str,
    chain: str,
    action: str,
    protocol: Optional[str] = None,
    source: Optional[str] = None,
    destination: Optional[str] = None,
    port: Optional[str] = None,
    in_interface: Optional[str] = None,
    out_interface: Optional[str] = None,
    state: Optional[str] = None,
    comment: Optional[str] = None
) -> bool:
    """Add a firewall rule to a chain."""
    args = build_rule_args(
        chain=chain,
        action=action,
        protocol=protocol,
        source=source,
        destination=destination,
        port=port,
        in_interface=in_interface,
        out_interface=out_interface,
        state=state,
        comment=comment,
        operation="-A"
    )
    
    success, _ = _run_iptables(table, args)
    return success


def delete_rule_by_spec(
    table: str,
    chain: str,
    action: str,
    protocol: Optional[str] = None,
    source: Optional[str] = None,
    destination: Optional[str] = None,
    port: Optional[str] = None,
    in_interface: Optional[str] = None,
    out_interface: Optional[str] = None,
    state: Optional[str] = None,
    comment: Optional[str] = None
) -> bool:
    """Delete a firewall rule by its specification."""
    args = build_rule_args(
        chain=chain,
        action=action,
        protocol=protocol,
        source=source,
        destination=destination,
        port=port,
        in_interface=in_interface,
        out_interface=out_interface,
        state=state,
        comment=comment,
        operation="-D"
    )
    
    success, _ = _run_iptables(table, args, suppress_errors=True)
    return success


def save_rules() -> bool:
    """
    Save current iptables rules to persistent storage.
    Uses iptables-save on Linux.
    """
    if settings.mock_iptables:
        logger.debug("[MOCK] Would save iptables rules")
        return True
    
    try:
        # Try using iptables-save via script
        result = subprocess.run(
            ["/opt/madmin/scripts/save-iptables.sh"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            logger.info("Iptables rules saved")
            return True
        logger.error(f"Failed to save rules: {result.stderr}")
        return False
    except FileNotFoundError:
        logger.warning("save-iptables.sh not found, trying iptables-save directly")
        try:
            result = subprocess.run(
                ["iptables-save"],
                capture_output=True,
                text=True
            )
            # Write to standard location
            with open("/etc/iptables/rules.v4", "w") as f:
                f.write(result.stdout)
            logger.info("Iptables rules saved to /etc/iptables/rules.v4")
            return True
        except Exception as e:
            logger.error(f"Failed to save rules: {e}")
            return False


def initialize_core_chains() -> bool:
    """
    Initialize MADMIN core chains.
    Creates MADMIN_INPUT, MADMIN_OUTPUT, MADMIN_FORWARD chains
    and sets up jumps from the main chains.
    """
    success = True
    
    for parent, madmin_chain in CHAIN_MAP.items():
        # Create or flush the chain
        if not create_or_flush_chain(madmin_chain, "filter"):
            logger.error(f"Failed to create chain {madmin_chain}")
            success = False
            continue
        
        # Ensure jump rule exists - use position 1 (first) for initial setup
        # On fresh systems this works, and we append if insert fails
        if not ensure_jump_rule(parent, madmin_chain, "filter", position=1):
            # Fallback to append if insert at position 1 fails
            logger.warning(f"Insert at position 1 failed, trying append for {madmin_chain}")
            if not ensure_jump_rule(parent, madmin_chain, "filter", position=None):
                logger.error(f"Failed to add jump from {parent} to {madmin_chain}")
                success = False
    
    if success:
        logger.info("Core firewall chains initialized successfully")
    
    return success
