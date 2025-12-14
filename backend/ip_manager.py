import logging
import ipaddress
from typing import Optional
from sqlmodel import Session, select
from database import engine
from models import Client, Instance

logger = logging.getLogger(__name__)

def get_assigned_ip(instance_id: str, client_name: str) -> Optional[str]:
    """Finds the assigned static IP for a client via DB query."""
    with Session(engine) as session:
        client = session.exec(select(Client).where(Client.instance_id == instance_id, Client.name == client_name)).first()
        if client:
            return client.allocated_ip
    return None

def allocate_static_ip(instance_id: str, subnet: str, client_name: str) -> Optional[str]:
    """
    Allocates the next available static IP from the subnet.
    It does NOT save to DB immediately; it returns the string.
    The caller (vpn_manager) must save it to the Client record.
    """
    try:
        network = ipaddress.ip_network(subnet, strict=False)
    except ValueError:
        logger.error(f"Invalid subnet: {subnet}")
        return None

    with Session(engine) as session:
        # Get all currently allocated IPs for this instance
        clients = session.exec(select(Client).where(Client.instance_id == instance_id)).all()
        used_ips = {c.allocated_ip for c in clients}

        # Reserve Network, Broadcast, and Gateway (.1)
        used_ips.add(str(network.network_address))
        used_ips.add(str(network.broadcast_address))
        server_ip = list(network.hosts())[0]
        used_ips.add(str(server_ip))

        # Find first free IP
        for ip in network.hosts():
            ip_str = str(ip)
            if ip_str not in used_ips:
                logger.info(f"Allocating {ip_str} to {client_name} (pending save)")
                return ip_str

    logger.error(f"No available IPs in subnet {subnet}")
    return None

def release_static_ip(instance_id: str, client_name: str):
    """
    Releasing IP is now implicit when the Client record is deleted from DB.
    This function is kept for interface compatibility but does nothing active.
    """
    logger.info(f"IP release for {client_name} handled via DB deletion.")
