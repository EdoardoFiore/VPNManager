#!/bin/bash
# Script to persist iptables rules for OpenVPN instances
# This script saves current iptables rules to a file

RULES_FILE="/etc/iptables/openvpn-rules.v4"

mkdir -p /etc/iptables

# Save current rules
iptables-save > "$RULES_FILE"

echo "iptables rules saved to $RULES_FILE"
