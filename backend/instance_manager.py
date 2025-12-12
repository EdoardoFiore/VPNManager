import json
import os
import subprocess
import logging
import re
from ipaddress import ip_network, ip_address, AddressValueError
from typing import List, Optional, Dict
from pydantic import BaseModel
import iptables_manager
import wireguard_manager

logger = logging.getLogger(__name__)

DATA_FILE = "/opt/vpn-manager/backend/data/instances.json"
WIREGUARD_CONFIG_DIR = "/etc/wireguard"

class Instance(BaseModel):
    id: str
    name: str
    port: int
    subnet: str  # e.g., "10.8.0.0/24"
    interface: str # e.g., "wg0", "wg1"
    private_key: str # Server Private Key
    public_key: str # Server Public Key
    tunnel_mode: str = "full"  # "full" or "split"
    routes: List[Dict[str, str]] = []  # List of {"network": "192.168.1.0/24"} for split tunnel default
    dns_servers: List[str] = ["1.1.1.1", "1.0.0.1"] # Default DNS
    firewall_default_policy: str = "ACCEPT"  # Can be "ACCEPT" or "DROP"
    clients: List[str] = []  # List of client names associated with this instance
    connected_clients: int = 0
    status: str = "stopped" # stopped, running
    type: str = "wireguard" # Explicit type

def _save_iptables_rules():
    """Save current iptables rules to persist across reboots."""
    # We rely on iptables-persistent or our own save script
    save_script = "/opt/vpn-manager/scripts/save-iptables.sh"
    if os.path.exists(save_script):
        try:
            subprocess.run(["bash", save_script], check=True)
            logger.info("iptables rules saved successfully")
        except subprocess.CalledProcessError as e:
            logger.warning(f"Failed to save iptables rules: {e}")

def _load_instances() -> List[Instance]:
    instances = []
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                data = json.load(f)
                # Filter/Migrate old data if necessary, or just load
                for item in data:
                    try:
                        instances.append(Instance(**item))
                    except Exception as e:
                         logger.warning(f"Skipping invalid instance data: {item} - {e}")
        except json.JSONDecodeError:
            pass
    
    # Sync firewall rules for all instances
    for inst in instances:
        _sync_instance_firewall_rules(inst)
            
    return instances

def _save_instances(instances: List[Instance]):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump([inst.dict() for inst in instances], f, indent=4)

def _sync_instance_firewall_rules(instance: Instance):
    """
    Ensures that the instance's firewall rules are registered in iptables_manager.
    """
    try:
        configs = iptables_manager._load_openvpn_rules_config()
        # We use a consistent ID format based on port or ID
        rule_id = instance.id 
        
        if rule_id not in configs:
            logger.info(f"Syncing firewall rules for instance {instance.name} (ID: {rule_id})")
            iptables_manager.add_openvpn_rules( # Function name to be renamed later to add_vpn_rules
                port=instance.port,
                proto="udp", # WireGuard is always UDP
                tun_interface=instance.interface,
                subnet=instance.subnet,
                outgoing_interface=None 
            )
    except Exception as e:
        logger.error(f"Failed to sync firewall rules for instance {instance.name}: {e}")

def get_instance_by_id(instance_id: str) -> Optional[Instance]:
    instances = get_all_instances()
    for inst in instances:
        if inst.id == instance_id:
            return inst
    return None

def get_all_instances() -> List[Instance]:
    instances = _load_instances()
    # Update status based on systemd
    for inst in instances:
        if _is_service_active(inst):
            inst.status = "running"
        else:
            inst.status = "stopped"
    return instances

def get_instance(instance_id: str) -> Optional[Instance]:
    return get_instance_by_id(instance_id)

def _get_service_name(instance: Instance) -> str:
    # WireGuard uses wg-quick@<interface>
    return f"wg-quick@{instance.interface}"

def _is_service_active(instance: Instance) -> bool:
    service_name = _get_service_name(instance)
    try:
        subprocess.run(["/usr/bin/systemctl", "is-active", "--quiet", service_name], check=True)
        return True
    except subprocess.CalledProcessError:
        return False

def create_instance(name: str, port: int, subnet: str, 
                   tunnel_mode: str = "full", routes: List[Dict[str, str]] = None, dns_servers: List[str] = None) -> Instance:
    """
    Creates a new WireGuard instance.
    """
    # --- Validation ---
    logger.info(f"Validating instance creation request: name={name}, port={port}, subnet={subnet}")
    name_regex = r"^[a-zA-Z0-9_]+$" # Removed hyphen to be safer with interface names sometimes
    if not re.fullmatch(name_regex, name):
        raise ValueError("Il nome dell'istanza può contenere solo lettere, numeri e underscore.")

    try:
        new_subnet = ip_network(subnet, strict=False)
        if not new_subnet.is_private:
            raise ValueError(f"La subnet '{subnet}' deve appartenere a un range di IP privati (RFC 1918).")
    except (AddressValueError, ValueError) as e:
         raise ValueError(f"Formato subnet non valido: '{subnet}'. Usare la notazione CIDR (es. 10.8.0.0/24).")

    instances = get_all_instances()
    
    if any(inst.name.lower() == name.lower() for inst in instances):
        raise ValueError(f"Istanza con nome '{name}' già esistente.")
    
    if any(inst.port == port for inst in instances):
        raise ValueError(f"Porta {port} già in uso.")
        
    # Check subnet overlap
    for inst in instances:
        try:
            existing_subnet = ip_network(inst.subnet, strict=False)
            if new_subnet.overlaps(existing_subnet):
                raise ValueError(f"La subnet '{subnet}' è in conflitto con la subnet '{inst.subnet}' (istanza '{inst.name}').")
        except: continue

    # Determine Interface Name (wg0, wg1, ...)
    used_interfaces = [inst.interface for inst in instances]
    next_id = 0
    while f"wg{next_id}" in used_interfaces:
        next_id += 1
    interface_name = f"wg{next_id}"
    
    logger.info(f"Assigned Interface: {interface_name}")

    instance_id = name.lower().replace(" ", "_")
    
    if routes is None: routes = []
    if dns_servers is None: dns_servers = ["1.1.1.1", "1.0.0.1"]

    # --- WireGuard Key Generation ---
    priv_key, pub_key = wireguard_manager.WireGuardManager.generate_keypair()

    new_instance = Instance(
        id=instance_id,
        name=name,
        port=port,
        subnet=subnet,
        interface=interface_name,
        private_key=priv_key,
        public_key=pub_key,
        tunnel_mode=tunnel_mode,
        routes=routes,
        dns_servers=dns_servers,
        status="stopped"
    )

    # --- Config Generation ---
    # IP Address for Server Interface is usually .1 of the subnet
    # e.g. 10.8.0.0/24 -> 10.8.0.1/24
    server_ip = str(list(new_subnet.hosts())[0]) + "/" + str(new_subnet.prefixlen)
    
    config_content = wireguard_manager.WireGuardManager.create_interface_config(
        instance_name=interface_name,
        listen_port=port,
        private_key=priv_key,
        address=server_ip
    )
    
    config_path = os.path.join(WIREGUARD_CONFIG_DIR, f"{interface_name}.conf")
    
    try:
        os.makedirs(WIREGUARD_CONFIG_DIR, exist_ok=True)
        # Set permission strict for folder if needed, but file definitely needs 600
        with open(config_path, "w") as f:
            f.write(config_content)
        os.chmod(config_path, 0o600)
        logger.info(f"Created WireGuard config at {config_path}")
    except Exception as e:
        raise RuntimeError(f"Failed to write WireGuard config: {e}")

    # --- Service Startup ---
    service_name = _get_service_name(new_instance)
    try:
        logger.info(f"Enabling and starting service: {service_name}")
        subprocess.run(["systemctl", "enable", service_name], check=True)
        subprocess.run(["systemctl", "start", service_name], check=True)
        new_instance.status = "running"
    except subprocess.CalledProcessError as e:
        # Cleanup
        try: os.remove(config_path) 
        except: pass
        raise RuntimeError(f"Failed to start WireGuard service: {e}")

    # --- Firewall Rules ---
    # Register with iptables manager
    iptables_manager.add_openvpn_rules( # Rename later
        port=port,
        proto="udp",
        tun_interface=interface_name,
        subnet=subnet
    )
    
    # Save Instance
    instances.append(new_instance)
    _save_instances(instances)
    
    # Trigger Firewall Refresh (to apply rules to chains)
    try:
        import firewall_manager as instance_firewall_manager
        instance_firewall_manager.apply_firewall_rules()
    except Exception as e:
        logger.error(f"Failed to apply firewall rules: {e}")

    return new_instance

def delete_instance(instance_id: str):
    instances = _load_instances()
    inst = next((i for i in instances if i.id == instance_id), None)
    if not inst:
        raise ValueError("Instance not found")

    # Stop Service
    service_name = _get_service_name(inst)
    subprocess.run(["systemctl", "stop", service_name], check=False)
    subprocess.run(["systemctl", "disable", service_name], check=False)

    # Remove iptables rules
    iptables_manager.remove_openvpn_rules(inst.port, "udp", inst.interface, inst.subnet)
    _save_iptables_rules()

    # Remove Config File
    config_path = os.path.join(WIREGUARD_CONFIG_DIR, f"{inst.interface}.conf")
    if os.path.exists(config_path):
        os.remove(config_path)

    # Remove from DB
    instances = [i for i in instances if i.id != instance_id]
    _save_instances(instances)

def update_instance_routes(instance_id: str, tunnel_mode: str, routes: List[Dict[str, str]], dns_servers: List[str] = None) -> Instance:
    """
    Updates instance routing preferences. 
    Note: In WireGuard, this mostly affects Client Config generation, 
    but we might want to update DNS pushed to clients if we were using a DNS forwarder (not yet).
    Ideally, we just update the DB object so future client configs get new settings.
    """
    instances = get_all_instances()
    instance = next((i for i in instances if i.id == instance_id), None)
    
    if not instance:
        raise ValueError(f"Instance '{instance_id}' not found")
    
    # Validation
    if dns_servers:
        for ip in dns_servers:
            try: ip_address(ip)
            except ValueError: raise ValueError(f"Invalid DNS IP: {ip}")

    instance.tunnel_mode = tunnel_mode
    if tunnel_mode == "full":
        instance.routes = []
    else:
        instance.routes = routes

    if dns_servers is not None:
        instance.dns_servers = dns_servers
    
    _save_instances(instances)
    
    # Trigger firewall update just in case routes affect server-side firewalling (VIG chains)
    try:
        import firewall_manager as instance_firewall_manager
        instance_firewall_manager.apply_firewall_rules()
    except Exception as e:
        logger.error(f"Failed to apply firewall rules: {e}")

    return instance

def update_instance_firewall_policy(instance_id: str, new_policy: str) -> Instance:
    if new_policy.upper() not in ["ACCEPT", "DROP"]:
        raise ValueError("Policy must be ACCEPT or DROP")

    instances = _load_instances()
    found = False
    for inst in instances:
        if inst.id == instance_id:
            inst.firewall_default_policy = new_policy.upper()
            found = True
            break
    
    if not found:
        raise ValueError("Instance not found")

    _save_instances(instances)
    import firewall_manager as instance_firewall_manager
    instance_firewall_manager.apply_firewall_rules()
    return inst

# Stub for client management functions required by main.py but moved to vpn_manager logic usually
# but for now main.py calls vpn_manager for clients. 
# instance_manager handles Instance object CRUD.