#!/bin/bash
# Script to restore iptables rules for OpenVPN instances
# This script is called on boot

RULES_FILE="/etc/iptables/openvpn-rules.v4"

if [ -f "$RULES_FILE" ]; then
    iptables-restore < "$RULES_FILE"
    echo "iptables rules restored from $RULES_FILE"
else
    echo "No saved iptables rules found at $RULES_FILE"
fi
