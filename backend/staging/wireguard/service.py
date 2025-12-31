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
    
    # --- Firewall Integration ---
    # 
    # Chain hierarchy:
    # INPUT → MADMIN_INPUT → WG_INPUT → WG_{id}_INPUT
    # FORWARD → MADMIN_FORWARD → WG_FORWARD → WG_{id}_FWD
    # POSTROUTING (nat) → WG_NAT → WG_{id}_NAT
    #
    
    # Module-level main chain names
    WG_INPUT_CHAIN = "WG_INPUT"
    WG_FORWARD_CHAIN = "WG_FORWARD"
    WG_NAT_CHAIN = "WG_NAT"
    
    @staticmethod
    def _run_iptables(table: str, args: List[str], suppress_errors: bool = False) -> bool:
        """Execute an iptables command."""
        cmd = ["iptables", "-t", table] + args
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            return True
        except subprocess.CalledProcessError as e:
            if not suppress_errors:
                logger.error(f"iptables error: {e.stderr.strip()} cmd: {' '.join(cmd)}")
            return False
        except FileNotFoundError:
            logger.error("iptables command not found")
            return False
    
    @staticmethod
    def _get_default_interface() -> str:
        """Detect the default network interface."""
        try:
            result = subprocess.run(
                ["/usr/sbin/ip", "-o", "-4", "route", "show", "default"],
                capture_output=True, text=True, check=True
            )
            if result.stdout:
                parts = result.stdout.split()
                if "dev" in parts:
                    return parts[parts.index("dev") + 1]
        except Exception as e:
            logger.warning(f"Could not detect default interface: {e}")
        return "eth0"
    
    @staticmethod
    def _create_or_flush_chain(chain_name: str, table: str = "filter") -> bool:
        """Create chain if doesn't exist, or flush it."""
        # Try to create
        if not WireGuardService._run_iptables(table, ["-N", chain_name], suppress_errors=True):
            # Creation failed (likely exists), flush it
            return WireGuardService._run_iptables(table, ["-F", chain_name])
        return True
    
    @staticmethod
    def _create_chain_if_not_exists(chain_name: str, table: str = "filter") -> bool:
        """Create chain only if it doesn't exist (don't flush)."""
        return WireGuardService._run_iptables(table, ["-N", chain_name], suppress_errors=True) or \
               WireGuardService._run_iptables(table, ["-L", chain_name, "-n"], suppress_errors=True)
    
    @staticmethod
    def _ensure_jump_rule(source_chain: str, target_chain: str, table: str = "filter") -> bool:
        """Ensure a jump rule exists from source to target chain (append, don't duplicate)."""
        # Check if jump already exists
        success, output = WireGuardService._run_iptables_with_output(
            table, ["-L", source_chain, "-n"]
        )
        if success and target_chain in output:
            return True  # Already exists
        # Add the jump
        return WireGuardService._run_iptables(table, ["-A", source_chain, "-j", target_chain])
    
    @staticmethod
    def _run_iptables_with_output(table: str, args: List[str], suppress_errors: bool = False) -> tuple:
        """Execute an iptables command and return (success, output)."""
        cmd = ["iptables", "-t", table] + args
        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            return True, result.stdout
        except subprocess.CalledProcessError as e:
            if not suppress_errors:
                logger.error(f"iptables error: {e.stderr.strip()} cmd: {' '.join(cmd)}")
            return False, e.stderr
        except FileNotFoundError:
            logger.error("iptables command not found")
            return False, ""
    
    @staticmethod
    def _remove_jump_rule(source_chain: str, target_chain: str, table: str = "filter") -> bool:
        """Remove a jump rule."""
        return WireGuardService._run_iptables(table, ["-D", source_chain, "-j", target_chain], suppress_errors=True)
    
    @staticmethod
    def _delete_chain(chain_name: str, table: str = "filter") -> bool:
        """Flush and delete a chain."""
        WireGuardService._run_iptables(table, ["-F", chain_name], suppress_errors=True)
        return WireGuardService._run_iptables(table, ["-X", chain_name], suppress_errors=True)
    
    @staticmethod
    def initialize_module_firewall_chains() -> bool:
        """
        Initialize WireGuard module-level firewall chains.
        Should be called on module load/application startup.
        
        Creates:
        - WG_INPUT: Main input chain for all WireGuard instances
        - WG_FORWARD: Main forward chain for all WireGuard instances  
        - WG_NAT: Main NAT chain for all WireGuard instances
        
        And links them to MADMIN chains (or main chains if MADMIN doesn't exist).
        """
        logger.info("Initializing WireGuard module firewall chains...")
        
        # 1. Create module main chains (don't flush - preserve existing instance rules)
        WireGuardService._create_chain_if_not_exists(WireGuardService.WG_INPUT_CHAIN, "filter")
        WireGuardService._create_chain_if_not_exists(WireGuardService.WG_FORWARD_CHAIN, "filter")
        WireGuardService._create_chain_if_not_exists(WireGuardService.WG_NAT_CHAIN, "nat")
        
        # 2. Link module chains to parent chains
        # Check if MADMIN chains exist
        madmin_exists = WireGuardService._run_iptables(
            "filter", ["-L", "MADMIN_INPUT", "-n"], suppress_errors=True
        )
        
        if madmin_exists:
            # Link to MADMIN chains
            WireGuardService._ensure_jump_rule("MADMIN_INPUT", WireGuardService.WG_INPUT_CHAIN, "filter")
            WireGuardService._ensure_jump_rule("MADMIN_FORWARD", WireGuardService.WG_FORWARD_CHAIN, "filter")
        else:
            # Link directly to main chains
            WireGuardService._ensure_jump_rule("INPUT", WireGuardService.WG_INPUT_CHAIN, "filter")
            WireGuardService._ensure_jump_rule("FORWARD", WireGuardService.WG_FORWARD_CHAIN, "filter")
        
        # NAT chain - link to POSTROUTING
        WireGuardService._ensure_jump_rule("POSTROUTING", WireGuardService.WG_NAT_CHAIN, "nat")
        
        logger.info("WireGuard module firewall chains initialized")
        return True
    
    @staticmethod
    def apply_instance_firewall_rules(instance_id: str, port: int, interface: str, subnet: str) -> bool:
        """
        Apply firewall rules for a WireGuard instance.
        
        Creates instance-specific chains:
        - WG_{id}_INPUT: Allows UDP port and interface traffic
        - WG_{id}_FWD: Allows forwarding to/from VPN interface
        - WG_{id}_NAT: Masquerades traffic from VPN subnet
        
        And links them to the module main chains (WG_INPUT, WG_FORWARD, WG_NAT).
        """
        # Ensure module chains are initialized first
        WireGuardService.initialize_module_firewall_chains()
        
        # Instance chain names
        input_chain = f"WG_{instance_id}_INPUT"
        forward_chain = f"WG_{instance_id}_FWD"
        nat_chain = f"WG_{instance_id}_NAT"
        
        wan_interface = WireGuardService._get_default_interface()
        
        logger.info(f"Applying firewall rules for WireGuard instance {instance_id}")
        
        # 1. Create/flush instance chains
        WireGuardService._create_or_flush_chain(input_chain, "filter")
        WireGuardService._create_or_flush_chain(forward_chain, "filter")
        WireGuardService._create_or_flush_chain(nat_chain, "nat")
        
        # 2. Add rules to INPUT chain
        # Allow UDP traffic on WireGuard port
        WireGuardService._run_iptables("filter", [
            "-A", input_chain, "-p", "udp", "--dport", str(port), "-j", "ACCEPT"
        ])
        # Allow all traffic from WireGuard interface
        WireGuardService._run_iptables("filter", [
            "-A", input_chain, "-i", interface, "-j", "ACCEPT"
        ])
        # Return to continue processing
        WireGuardService._run_iptables("filter", [
            "-A", input_chain, "-j", "RETURN"
        ])
        
        # 3. Add rules to FORWARD chain
        # Allow forwarding to/from VPN interface
        WireGuardService._run_iptables("filter", [
            "-A", forward_chain, "-i", interface, "-j", "ACCEPT"
        ])
        WireGuardService._run_iptables("filter", [
            "-A", forward_chain, "-o", interface, "-j", "ACCEPT"
        ])
        WireGuardService._run_iptables("filter", [
            "-A", forward_chain, "-j", "RETURN"
        ])
        
        # 4. Add rules to NAT chain
        # Masquerade traffic from VPN subnet going to WAN
        WireGuardService._run_iptables("nat", [
            "-A", nat_chain, "-s", subnet, "-o", wan_interface, "-j", "MASQUERADE"
        ])
        WireGuardService._run_iptables("nat", [
            "-A", nat_chain, "-j", "RETURN"
        ])
        
        # 5. Link instance chains to module main chains
        WireGuardService._ensure_jump_rule(WireGuardService.WG_INPUT_CHAIN, input_chain, "filter")
        WireGuardService._ensure_jump_rule(WireGuardService.WG_FORWARD_CHAIN, forward_chain, "filter")
        WireGuardService._ensure_jump_rule(WireGuardService.WG_NAT_CHAIN, nat_chain, "nat")
        
        logger.info(f"Firewall rules applied for WireGuard instance {instance_id}")
        logger.info(f"  Chains created: {input_chain}, {forward_chain}, {nat_chain}")
        logger.info(f"  Linked to: WG_INPUT, WG_FORWARD, WG_NAT")
        return True
    
    @staticmethod
    def remove_instance_firewall_rules(instance_id: str) -> bool:
        """
        Remove firewall rules for a WireGuard instance.
        """
        input_chain = f"WG_{instance_id}_INPUT"
        forward_chain = f"WG_{instance_id}_FWD"
        nat_chain = f"WG_{instance_id}_NAT"
        
        logger.info(f"Removing firewall rules for WireGuard instance {instance_id}")
        
        # Remove jumps from module main chains
        WireGuardService._remove_jump_rule(WireGuardService.WG_INPUT_CHAIN, input_chain, "filter")
        WireGuardService._remove_jump_rule(WireGuardService.WG_FORWARD_CHAIN, forward_chain, "filter")
        WireGuardService._remove_jump_rule(WireGuardService.WG_NAT_CHAIN, nat_chain, "nat")
        
        # Delete instance chains
        WireGuardService._delete_chain(input_chain, "filter")
        WireGuardService._delete_chain(forward_chain, "filter")
        WireGuardService._delete_chain(nat_chain, "nat")
        
        logger.info(f"Firewall rules removed for WireGuard instance {instance_id}")
        return True


wireguard_service = WireGuardService()
