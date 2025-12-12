import os
import logging
import json
import ipaddress
from typing import Optional, Dict

logger = logging.getLogger(__name__)

# New data directory for IP allocations
DATA_DIR = "/opt/vpn-manager/backend/data/allocations"

def _get_allocation_file(instance_id: str) -> str:
    return os.path.join(DATA_DIR, f"{instance_id}.json")

def _load_allocations(instance_id: str) -> Dict[str, str]:
    """Returns a dict {client_name: ip_address}."""
    path = _get_allocation_file(instance_id)
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading IP allocations for {instance_id}: {e}")
            return {}
    return {}

def _save_allocations(instance_id: str, allocations: Dict[str, str]):
    os.makedirs(DATA_DIR, exist_ok=True)
    path = _get_allocation_file(instance_id)
    try:
        with open(path, "w") as f:
            json.dump(allocations, f, indent=4)
    except Exception as e:
        logger.error(f"Error saving IP allocations for {instance_id}: {e}")

def get_assigned_ip(instance_id: str, client_name: str) -> Optional[str]:
    """Finds the assigned static IP for a client."""
    allocs = _load_allocations(instance_id)
    return allocs.get(client_name)

def allocate_static_ip(instance_id: str, subnet: str, client_name: str) -> Optional[str]:
    """
    Allocates the next available static IP from the subnet.
    """
    allocs = _load_allocations(instance_id)
    
    # Check if already allocated
    if client_name in allocs:
        return allocs[client_name]

    try:
        network = ipaddress.ip_network(subnet, strict=False)
    except ValueError:
        logger.error(f"Invalid subnet: {subnet}")
        return None

    used_ips = set(allocs.values())
    
    # Reserve Server IP (usually .1) and Network/Broadcast
    used_ips.add(str(network.network_address))
    used_ips.add(str(network.broadcast_address))
    server_ip = list(network.hosts())[0]
    used_ips.add(str(server_ip))
    
    # Find free IP
    for ip in network.hosts():
        ip_str = str(ip)
        if ip_str not in used_ips:
            allocs[client_name] = ip_str
            _save_allocations(instance_id, allocs)
            logger.info(f"Allocated {ip_str} to {client_name} in {instance_id}")
            return ip_str
            
    logger.error(f"No available IPs in subnet {subnet}")
    return None

def release_static_ip(instance_id: str, client_name: str):
    """Releases the allocated IP."""
    allocs = _load_allocations(instance_id)
    if client_name in allocs:
        del allocs[client_name]
        _save_allocations(instance_id, allocs)
        logger.info(f"Released IP for {client_name}")