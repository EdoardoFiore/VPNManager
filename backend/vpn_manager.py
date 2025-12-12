import json
import os
import logging
from typing import List, Dict, Optional, Tuple
from pydantic import BaseModel
import ip_manager
import instance_manager
import wireguard_manager

logger = logging.getLogger(__name__)

CLIENTS_DATA_DIR = "/opt/vpn-manager/backend/data/clients"

class WireGuardClient(BaseModel):
    name: str
    instance_id: str
    private_key: str
    public_key: str
    preshared_key: str
    allocated_ip: str
    created_at: str = "" # ISO timestamp ideally

def _get_clients_file(instance_id: str) -> str:
    return os.path.join(CLIENTS_DATA_DIR, f"{instance_id}.json")

def _load_clients(instance_id: str) -> List[WireGuardClient]:
    path = _get_clients_file(instance_id)
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                data = json.load(f)
                return [WireGuardClient(**item) for item in data]
        except Exception as e:
            logger.error(f"Error loading clients for {instance_id}: {e}")
            return []
    return []

def _save_clients(instance_id: str, clients: List[WireGuardClient]):
    os.makedirs(CLIENTS_DATA_DIR, exist_ok=True)
    path = _get_clients_file(instance_id)
    with open(path, "w") as f:
        json.dump([c.dict() for c in clients], f, indent=4)

def list_clients(instance_id: str) -> List[Dict]:
    """Returns a list of clients for the instance."""
    clients = _load_clients(instance_id)
    # We can add status info here if we parse 'wg show' dump
    # For now, return static data
    return [c.dict() for c in clients]

def get_connected_clients(instance_name: str) -> Dict:
    """
    Parses 'wg show <interface> dump' to get real-time stats.
    instance_name is usually the interface name or ID.
    But 'instance_manager' usually passes ID.
    We need to resolve to Interface Name.
    """
    # Assuming instance_name passed here is the ID.
    inst = instance_manager.get_instance_by_id(instance_name)
    if not inst: return {}
    
    interface = inst.interface
    try:
        # wg show wg0 dump
        # Output: public-key, preshared-key, endpoint, allowed-ips, latest-handshake, transfer-rx, transfer-tx, persistent-keepalive
        output = wireguard_manager.WireGuardManager._run_wg_command(['show', interface, 'dump'])
        lines = output.splitlines()
        connected = {}
        
        # Load known clients to map Public Key -> Name
        known_clients = _load_clients(instance_name)
        pubkey_to_name = {c.public_key: c.name for c in known_clients}
        
        for line in lines[1:]: # Skip header if present (dump usually has no header, but let's be safe)
            parts = line.split('\t')
            if len(parts) >= 7:
                pub_key = parts[0]
                endpoint = parts[2]
                handshake = int(parts[4])
                rx = int(parts[5])
                tx = int(parts[6])
                
                # Check if active (handshake < 3 mins ago is a good heuristic for "connected")
                import time
                now = int(time.time())
                is_active = (now - handshake) < 180 if handshake > 0 else False
                
                if is_active:
                    name = pubkey_to_name.get(pub_key, "Unknown")
                    connected[name] = {
                        "virtual_ip": endpoint.split(':')[0] if ':' in endpoint else endpoint,
                        "bytes_received": rx,
                        "bytes_sent": tx,
                        "connected_since": handshake # Timestamp
                    }
        return connected

    except Exception as e:
        logger.error(f"Error getting connected clients: {e}")
        return {}

def create_client(instance_id: str, client_name: str) -> Tuple[bool, Optional[str]]:
    inst = instance_manager.get_instance_by_id(instance_id)
    if not inst:
        return False, "Instance not found"
        
    clients = _load_clients(instance_id)
    if any(c.name == client_name for c in clients):
        return False, "Client name already exists"

    # 1. Generate Keys
    priv, pub = wireguard_manager.WireGuardManager.generate_keypair()
    psk = wireguard_manager.WireGuardManager.generate_psk()
    
    # 2. Allocate IP
    ip = ip_manager.allocate_static_ip(instance_id, inst.subnet, client_name)
    if not ip:
        return False, "No IP addresses available"
        
    # 3. Add to Server Config
    config_path = f"/etc/wireguard/{inst.interface}.conf"
    allowed_ips_server_side = f"{ip}/32" # Strict IP binding
    
    try:
        wireguard_manager.WireGuardManager.add_peer_to_interface_config(
            config_path, pub, psk, allowed_ips_server_side, comment=client_name
        )
        wireguard_manager.WireGuardManager.hot_reload_interface(inst.interface)
    except Exception as e:
        ip_manager.release_static_ip(instance_id, client_name)
        return False, f"Failed to update server config: {e}"

    # 4. Save Client Data
    new_client = WireGuardClient(
        name=client_name,
        instance_id=instance_id,
        private_key=priv,
        public_key=pub,
        preshared_key=psk,
        allocated_ip=ip
    )
    clients.append(new_client)
    _save_clients(instance_id, clients)
    
    return True, None

def revoke_client(instance_id: str, client_name: str) -> Tuple[bool, str]:
    inst = instance_manager.get_instance_by_id(instance_id)
    if not inst:
        return False, "Instance not found"

    clients = _load_clients(instance_id)
    client = next((c for c in clients if c.name == client_name), None)
    if not client:
        return False, "Client not found"
        
    # 1. Remove from Server Config
    config_path = f"/etc/wireguard/{inst.interface}.conf"
    try:
        wireguard_manager.WireGuardManager.remove_peer_from_interface_config(config_path, client.public_key)
        wireguard_manager.WireGuardManager.hot_reload_interface(inst.interface)
    except Exception as e:
        return False, f"Failed to update server config: {e}"
        
    # 2. Release IP
    ip_manager.release_static_ip(instance_id, client_name)
    
    # 3. Remove from JSON
    clients = [c for c in clients if c.name != client_name]
    _save_clients(instance_id, clients)
    
    return True, "Client revoked successfully"

def get_client_config(client_name: str, instance_id: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
    found_client = None
    found_inst_id = None
    
    if instance_id:
        clients = _load_clients(instance_id)
        for c in clients:
            if c.name == client_name:
                found_client = c
                found_inst_id = instance_id
                break
    else:
        # Inefficient search, but works if instance_id is missing
        for inst in instance_manager.get_all_instances():        clients = _load_clients(inst.id)
        for c in clients:
            if c.name == client_name:
                found_client = c
                found_inst_id = inst.id
                break
        if found_client: break
    
    if not found_client:
        return None, "Client not found"
        
    inst = instance_manager.get_instance_by_id(found_inst_id)
    
    # Build Configuration
    
    # 1. Routing (AllowedIPs)
    allowed_ips = "0.0.0.0/0, ::/0" # Default Full Tunnel
    if inst.tunnel_mode == "split":
        # Base subnet + custom routes
        routes = [inst.subnet]
        if inst.routes:
            for r in inst.routes:
                if 'network' in r: routes.append(r['network'])
        allowed_ips = ", ".join(routes)
    
    # 2. DNS
    dns_str = ", ".join(inst.dns_servers)
    
    # 3. Server Endpoint
    # We need Public IP. instance_manager doesn't store it yet (setup script got it).
    # We can detect it or use a placeholder.
    # Ideally, store it in Instance or global config.
    # Fallback: Detect external IP
    public_ip = "YOUR_SERVER_IP"
    try:
        public_ip = subprocess.run(["curl", "-s", "https://ifconfig.me"], capture_output=True, text=True).stdout.strip()
    except:
        pass
    
    # Construct INI
    config = f"""[Interface]
PrivateKey = {found_client.private_key}
Address = {found_client.allocated_ip}/32
DNS = {dns_str}

[Peer]
PublicKey = {inst.public_key}
PresharedKey = {found_client.preshared_key}
Endpoint = {public_ip}:{inst.port}
AllowedIPs = {allowed_ips}
PersistentKeepalive = 25
"""
    return config, None