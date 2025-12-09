import json
import os
import uuid
import logging
from typing import List, Dict, Optional, Union

# Assuming iptables_manager.py is in the same directory and contains MachineFirewallRule
from iptables_manager import MachineFirewallRule, apply_machine_firewall_rules

logger = logging.getLogger(__name__)

# Directory where configuration files are stored
CONFIG_DIR = "/opt/vpn-manager/config"
MACHINE_FIREWALL_RULES_FILE = os.path.join(CONFIG_DIR, "machine_firewall_rules.json")

class MachineFirewallManager:
    def __init__(self):
        self.rules: List[MachineFirewallRule] = []
        self._load_rules()
        # Apply rules on startup
        self.apply_all_rules()

    def _load_rules(self):
        """Loads machine firewall rules from a JSON file."""
        if not os.path.exists(CONFIG_DIR):
            os.makedirs(CONFIG_DIR)
        
        if os.path.exists(MACHINE_FIREWALL_RULES_FILE):
            try:
                with open(MACHINE_FIREWALL_RULES_FILE, 'r') as f:
                    rules_data = json.load(f)
                    self.rules = [MachineFirewallRule.from_dict(r) for r in rules_data]
                logger.info(f"Loaded {len(self.rules)} machine firewall rules.")
            except Exception as e:
                logger.error(f"Error loading machine firewall rules from {MACHINE_FIREWALL_RULES_FILE}: {e}")
                self.rules = [] # Reset rules if loading fails
        else:
            self.rules = []
            logger.info("No existing machine firewall rules file found.")

    def _save_rules(self):
        """Saves current machine firewall rules to a JSON file."""
        try:
            with open(MACHINE_FIREWALL_RULES_FILE, 'w') as f:
                json.dump([r.to_dict() for r in self.rules], f, indent=4)
            logger.info(f"Saved {len(self.rules)} machine firewall rules.")
        except Exception as e:
            logger.error(f"Error saving machine firewall rules to {MACHINE_FIREWALL_RULES_FILE}: {e}")

    def get_all_rules(self) -> List[Dict]:
        """Returns all machine firewall rules as dictionaries, sorted by order."""
        self.rules.sort(key=lambda r: r.order)
        return [r.to_dict() for r in self.rules]

    def add_rule(self, rule_data: Dict) -> Dict:
        """Adds a new machine firewall rule and applies it."""
        if not rule_data.get("id"):
            rule_data["id"] = str(uuid.uuid4())
        
        # Assign an order if not provided
        if rule_data.get("order") is None:
            rule_data["order"] = len(self.rules)
        
        new_rule = MachineFirewallRule.from_dict(rule_data)
        self.rules.append(new_rule)
        self._save_rules()
        self.apply_all_rules() # Apply changes immediately
        logger.info(f"Added new machine firewall rule: {new_rule.id}")
        return new_rule.to_dict()

    def delete_rule(self, rule_id: str):
        """Deletes a machine firewall rule by ID and applies changes."""
        original_len = len(self.rules)
        self.rules = [r for r in self.rules if r.id != rule_id]
        if len(self.rules) == original_len:
            logger.warning(f"Attempted to delete non-existent rule: {rule_id}")
            raise ValueError("Rule not found")
        
        self._reorder_rules_consecutively()
        self._save_rules()
        self.apply_all_rules() # Apply changes immediately
        logger.info(f"Deleted machine firewall rule: {rule_id}")

    def update_rule_order(self, orders: List[Dict]):
        """
        Updates the order of rules based on a list of {"id": "...", "order": N} objects.
        Then reapplies all rules.
        """
        id_to_order_map = {item["id"]: item["order"] for item in orders}
        for rule in self.rules:
            if rule.id in id_to_order_map:
                rule.order = id_to_order_map[rule.id]
        
        self.rules.sort(key=lambda r: r.order)
        self._save_rules()
        self.apply_all_rules() # Apply changes immediately
        logger.info("Updated order of machine firewall rules.")

    def _reorder_rules_consecutively(self):
        """Ensures rule orders are consecutive after deletion/reordering."""
        self.rules.sort(key=lambda r: r.order)
        for i, rule in enumerate(self.rules):
            rule.order = i
            
    def apply_all_rules(self) -> (bool, Optional[str]):
        """Applies all currently managed machine firewall rules using iptables_manager."""
        self.rules.sort(key=lambda r: r.order) # Ensure rules are applied in order
        success, error = apply_machine_firewall_rules(self.rules)
        if not success:
            logger.error(f"Failed to apply machine firewall rules: {error}")
        else:
            logger.info("Machine firewall rules successfully applied to system.")
        return success, error

# Initialize the manager
machine_firewall_manager = MachineFirewallManager()
