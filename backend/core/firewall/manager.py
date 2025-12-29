from typing import List
from sqlmodel import Session, select
import logging

from backend.core.database import engine
from backend.core.utils import run_command
from backend.core.firewall.models import FirewallRule, FirewallAction

logger = logging.getLogger("madmin.core.firewall")

MADMIN_INPUT = "FW_INPUT"
MADMIN_OUTPUT = "FW_OUTPUT"
MADMIN_FORWARD = "FW_FORWARD"

class FirewallManager:
    def __init__(self):
        pass

    def initialize_chains(self):
        """Ensures FW chains exist and are hooked."""
        logger.info("Initializing Firewall Chains...")
        
        # 1. Create Chains (idempotent-ish via suppress_errors)
        self._create_chain(MADMIN_INPUT, "filter")
        self._create_chain(MADMIN_OUTPUT, "filter")
        self._create_chain(MADMIN_FORWARD, "filter")

        # 2. Hook into System Chains (Position 1 to be first)
        self._ensure_jump("INPUT", MADMIN_INPUT)
        self._ensure_jump("OUTPUT", MADMIN_OUTPUT)
        self._ensure_jump("FORWARD", MADMIN_FORWARD)
        
    def apply_rules(self):
        """Re-applies all rules from DB."""
        # Ensure chains exist first
        self.initialize_chains()
        
        # Flush chains
        self._flush_chain(MADMIN_INPUT)
        self._flush_chain(MADMIN_OUTPUT)
        self._flush_chain(MADMIN_FORWARD)
        
        self._apply_base_rules()
        
        with Session(engine) as session:
            rules = session.exec(select(FirewallRule).where(FirewallRule.enabled == True).order_by(FirewallRule.priority)).all()
            
            for rule in rules:
                self._apply_single_rule(rule)

    def _apply_single_rule(self, rule: FirewallRule):
        chain = rule.chain_name
        if chain == "INPUT": chain = MADMIN_INPUT
        if chain == "OUTPUT": chain = MADMIN_OUTPUT
        if chain == "FORWARD": chain = MADMIN_FORWARD
        
        cmd = ["/usr/sbin/iptables", "-A", chain]
        
        # Protocol
        if rule.protocol and rule.protocol != "all":
            cmd.extend(["-p", rule.protocol])

        # Source/Dest
        if rule.source: cmd.extend(["-s", rule.source])
        if rule.destination: cmd.extend(["-d", rule.destination])
        
        # Port
        if rule.port and rule.protocol in ["tcp", "udp"]:
             cmd.extend(["--dport", str(rule.port)])
        
        # Interfaces
        if rule.in_interface: cmd.extend(["-i", rule.in_interface])
        if rule.out_interface: cmd.extend(["-o", rule.out_interface])
        
        # State
        if rule.state:
            cmd.extend(["-m", "state", "--state", rule.state])
        
        # Action
        cmd.extend(["-j", rule.action.value]) # Enum value
        
        # Comment
        if rule.description:
            # Sanitize comment
            safe_comment = "".join([c for c in rule.description if c.isalnum() or c in " -_"])[:50]
            cmd.extend(["-m", "comment", "--comment", safe_comment])
            
        run_command(cmd)

    def _apply_base_rules(self):
        # Allow Established/Related
        for chain in [MADMIN_INPUT, MADMIN_OUTPUT, MADMIN_FORWARD]:
            run_command(["/usr/sbin/iptables", "-A", chain, "-m", "conntrack", "--ctstate", "RELATED,ESTABLISHED", "-j", "ACCEPT"])
        
        # Allow Loopback
        run_command(["/usr/sbin/iptables", "-A", MADMIN_INPUT, "-i", "lo", "-j", "ACCEPT"])
        run_command(["/usr/sbin/iptables", "-A", MADMIN_OUTPUT, "-o", "lo", "-j", "ACCEPT"])

    def _create_chain(self, chain: str, table: str):
        # Create if not exists
        run_command(["/usr/sbin/iptables", "-t", table, "-N", chain], suppress_errors=True)

    def _flush_chain(self, chain: str):
         run_command(["/usr/sbin/iptables", "-F", chain])

    def _ensure_jump(self, system_chain: str, custom_chain: str):
        # Check if rule exists
        # Simplified: valid check logic or just Delete then Insert
        run_command(["/usr/sbin/iptables", "-D", system_chain, "-j", custom_chain], suppress_errors=True)
        run_command(["/usr/sbin/iptables", "-I", system_chain, "1", "-j", custom_chain])

# Singleton
firewall_mgr = FirewallManager()
