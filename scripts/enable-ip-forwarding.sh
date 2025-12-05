#!/bin/bash
# Script to enable IP forwarding for OpenVPN
# This should be run once during setup

echo "Enabling IP forwarding for OpenVPN..."

# Enable IPv4 forwarding
echo 'net.ipv4.ip_forward=1' > /etc/sysctl.d/99-openvpn.conf

# Apply immediately
sysctl -p /etc/sysctl.d/99-openvpn.conf

echo "IP forwarding enabled successfully"
