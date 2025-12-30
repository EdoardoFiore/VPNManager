"""
WireGuard Module - Service Layer

Business logic for WireGuard operations: key generation, config management,
interface control, IP allocation, QR code generation.
"""
import subprocess
import logging
from typing import Tuple, List, Optional
from pathlib import Path
from ipaddress import ip_network
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .models import WgInstance, WgClient

logger = logging.getLogger(__name__)
WIREGUARD_CONFIG_DIR = Path("/etc/wireguard")


class WireGuardService:
    """Service class for WireGuard operations."""
    
    @staticmethod
    def _run_wg_command(args: List[str], input_data: str = None) -> str:
        """Execute a 'wg' command."""
        try:
            result = subprocess.run(
                ['wg'] + args,
                capture_output=True, text=True, check=True,
                input=input_data
            )
            return result.stdout.strip()
        except FileNotFoundError:
            raise RuntimeError("WireGuard non installato")
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Comando WireGuard fallito: {e.stderr}")
    
    @staticmethod
    def generate_keypair() -> Tuple[str, str]:
        """Generate WireGuard key pair."""
        private_key = WireGuardService._run_wg_command(['genkey'])
        public_key = WireGuardService._run_wg_command(['pubkey'], input_data=private_key)
        return private_key, public_key
    
    @staticmethod
    def generate_psk() -> str:
        """Generate preshared key."""
        return WireGuardService._run_wg_command(['genpsk'])
    
    @staticmethod
    def create_server_config(interface: str, port: int, private_key: str, address: str) -> str:
        """Generate server interface config."""
        return f"""[Interface]
Address = {address}
ListenPort = {port}
PrivateKey = {private_key}
SaveConfig = false
"""
    
    @staticmethod
    def add_peer_to_config(config_path: Path, public_key: str, psk: str, 
                           allowed_ips: str, comment: str = "") -> None:
        """Append peer to config file."""
        peer_block = f"""
[Peer]
# {comment}
PublicKey = {public_key}
PresharedKey = {psk}
AllowedIPs = {allowed_ips}
"""
        with open(config_path, "a") as f:
            f.write(peer_block)
    
    @staticmethod
    def remove_peer_from_config(config_path: Path, public_key: str) -> None:
        """Remove peer from config by public key."""
        with open(config_path, "r") as f:
            lines = f.readlines()
        
        new_lines = []
        current_block = []
        block_contains_target = False
        
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("[Peer]") or stripped.startswith("[Interface]"):
                if current_block and not block_contains_target:
                    new_lines.extend(current_block)
                current_block = [line]
                block_contains_target = False
            else:
                current_block.append(line)
                if f"PublicKey = {public_key}" in stripped:
                    block_contains_target = True
        
        if current_block and not block_contains_target:
            new_lines.extend(current_block)
        
        with open(config_path, "w") as f:
            f.writelines(new_lines)
    
    @staticmethod
    def start_interface(interface: str) -> bool:
        """Start WireGuard interface."""
        try:
            subprocess.run(['wg-quick', 'up', interface], check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError:
            return False
    
    @staticmethod
    def stop_interface(interface: str) -> bool:
        """Stop WireGuard interface."""
        try:
            subprocess.run(['wg-quick', 'down', interface], check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError:
            return False
    
    @staticmethod
    def hot_reload_interface(interface: str) -> bool:
        """Apply config changes without restart."""
        config_path = WIREGUARD_CONFIG_DIR / f"{interface}.conf"
        try:
            stripped = subprocess.run(
                ['wg-quick', 'strip', str(config_path)],
                check=True, capture_output=True, text=True
            )
            subprocess.run(
                ['wg', 'syncconf', interface, '/dev/stdin'],
                input=stripped.stdout, check=True, capture_output=True, text=True
            )
            return True
        except subprocess.CalledProcessError:
            return False
    
    @staticmethod
    def get_interface_status(interface: str) -> bool:
        """Check if interface is running."""
        try:
            subprocess.run(['wg', 'show', interface], check=True, capture_output=True)
            return True
        except:
            return False
    
    @staticmethod
    async def allocate_client_ip(session: AsyncSession, instance: WgInstance) -> str:
        """Allocate next available IP for client."""
        network = ip_network(instance.subnet, strict=False)
        
        result = await session.execute(
            select(WgClient.allocated_ip).where(WgClient.instance_id == instance.id)
        )
        allocated = {row[0].split('/')[0] for row in result.fetchall()}
        allocated.add(str(list(network.hosts())[0]))  # Server IP
        
        for host in network.hosts():
            if str(host) not in allocated:
                return f"{host}/32"
        
        raise RuntimeError("Nessun IP disponibile nella subnet")
    
    @staticmethod
    def generate_client_config(instance: WgInstance, client: WgClient, endpoint: str) -> str:
        """Generate client config file content."""
        if instance.tunnel_mode == "full":
            allowed_ips = "0.0.0.0/0"
        else:
            routes = [r.get('network', '') for r in instance.routes if r.get('network')]
            routes.append(instance.subnet)
            allowed_ips = ", ".join(routes)
        
        dns = ", ".join(instance.dns_servers) if instance.dns_servers else "8.8.8.8"
        
        return f"""[Interface]
PrivateKey = {client.private_key}
Address = {client.allocated_ip}
DNS = {dns}

[Peer]
PublicKey = {instance.public_key}
PresharedKey = {client.preshared_key}
AllowedIPs = {allowed_ips}
Endpoint = {endpoint}:{instance.port}
PersistentKeepalive = 25
"""
    
    @staticmethod
    def generate_qr_code(config: str) -> bytes:
        """Generate QR code PNG for config."""
        try:
            result = subprocess.run(
                ['qrencode', '-t', 'PNG', '-o', '-'],
                input=config.encode('utf-8'), capture_output=True, text=False, check=True
            )
            return result.stdout
        except FileNotFoundError:
            raise RuntimeError("qrencode non installato")


wireguard_service = WireGuardService()
