import subprocess
import logging
import re
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)

# --- Generic System Commands ---

def run_command(command: List[str], check: bool = True, suppress_errors: bool = False) -> Tuple[bool, Optional[str]]:
    """Generic wrapper for subprocess run"""
    try:
        result = subprocess.run(command, check=check, capture_output=True, text=True)
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        if not suppress_errors:
            error_msg = f"Command error: {e.stderr.strip()} CMD: {' '.join(command)}"
            logger.error(error_msg)
            return False, error_msg
        return False, e.stderr.strip()
    except Exception as e:
        logger.error(f"Execution failed: {e}")
        return False, str(e)

# --- Network / Iptables Helpers ---

def get_default_interface() -> str:
    """Detects the default network interface."""
    try:
        result = subprocess.run(["/usr/sbin/ip", "-o", "-4", "route", "show", "default"], capture_output=True, text=True, check=True)
        if result.stdout:
            parts = result.stdout.split()
            if "dev" in parts:
                return parts[parts.index("dev") + 1]
    except Exception as e:
        logger.warning(f"Could not detect default interface using 'ip route': {e}")
    
    logger.warning("Falling back to 'eth0' as default interface.")
    return "eth0"

def run_iptables(table: str, args: List[str], suppress_errors: bool = False) -> Tuple[bool, Optional[str]]:
    """Run an iptables command."""
    command = ["/usr/sbin/iptables"]
    if table != "filter":
        command.extend(["-t", table])
    command.extend(args)

    return run_command(command, check=True, suppress_errors=suppress_errors)

def create_or_flush_chain(chain_name: str, table: str = "filter") -> bool:
    """Creates a chain if not exists, or flushes it if it does."""
    res, _ = run_iptables(table, ["-N", chain_name], suppress_errors=True)
    if not res:
        # If creation failed (likely exists), flush it
        run_iptables(table, ["-F", chain_name])
    return True

def delete_chain_if_empty(chain_name: str, table: str = "filter"):
    run_iptables(table, ["-F", chain_name])
    run_iptables(table, ["-X", chain_name])

def ensure_jump_rule(source_chain: str, target_chain: str, table: str = "filter", position: int = 1):
    """Ensures a jump rule exists from source to target at a specific position."""
    # First delete any existing jump to avoid duplicates
    run_iptables(table, ["-D", source_chain, "-j", target_chain], suppress_errors=True)
    
    # Try insert
    res, err = run_iptables(table, ["-I", source_chain, str(position), "-j", target_chain], suppress_errors=True)
    if res:
        logger.info(f"Enforced jump from {source_chain} to {target_chain} at pos {position}")
    else:
        # Fallback for "Index of insertion too big" or other insert errors
        logger.warning(f"Insert at pos {position} failed, falling back to Append (-A). Error: {err}")
        res_fallback, err_fallback = run_iptables(table, ["-A", source_chain, "-j", target_chain])
        if res_fallback:
             logger.info(f"Enforced jump from {source_chain} to {target_chain} via Append")
        else:
             logger.error(f"Failed to enforce jump rule: {err_fallback}")
