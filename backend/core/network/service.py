"""
MADMIN Network Service

Provides network interface information using psutil.
"""
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# Try to import psutil
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    logger.warning("psutil not installed. Network stats will be unavailable.")


class NetworkService:
    """Service class for network interface information."""
    
    @staticmethod
    def get_interfaces() -> List[Dict]:
        """
        Get all network interfaces with their details.
        
        Returns:
            List of dicts with interface info: name, addresses, mac, status, stats
        """
        if not PSUTIL_AVAILABLE:
            return []
        
        interfaces = []
        
        try:
            # Get interface addresses
            if_addrs = psutil.net_if_addrs()
            
            # Get interface stats
            if_stats = psutil.net_if_stats()
            
            # Get IO counters
            io_counters = psutil.net_io_counters(pernic=True)
            
            for iface_name, addrs in if_addrs.items():
                # Skip loopback for display purposes (but include in list)
                iface_info = {
                    "name": iface_name,
                    "ipv4": None,
                    "ipv6": None,
                    "mac": None,
                    "is_up": False,
                    "speed": 0,
                    "mtu": 0,
                    "bytes_sent": 0,
                    "bytes_recv": 0,
                    "packets_sent": 0,
                    "packets_recv": 0,
                    "errors_in": 0,
                    "errors_out": 0
                }
                
                # Parse addresses
                for addr in addrs:
                    if addr.family.name == 'AF_INET':
                        iface_info["ipv4"] = addr.address
                        iface_info["netmask"] = addr.netmask
                    elif addr.family.name == 'AF_INET6':
                        # Skip link-local IPv6
                        if not addr.address.startswith('fe80::'):
                            iface_info["ipv6"] = addr.address
                    elif addr.family.name == 'AF_LINK' or addr.family.name == 'AF_PACKET':
                        iface_info["mac"] = addr.address
                
                # Get stats if available
                if iface_name in if_stats:
                    stats = if_stats[iface_name]
                    iface_info["is_up"] = stats.isup
                    iface_info["speed"] = stats.speed  # Mbps
                    iface_info["mtu"] = stats.mtu
                
                # Get IO counters if available
                if iface_name in io_counters:
                    io = io_counters[iface_name]
                    iface_info["bytes_sent"] = io.bytes_sent
                    iface_info["bytes_recv"] = io.bytes_recv
                    iface_info["packets_sent"] = io.packets_sent
                    iface_info["packets_recv"] = io.packets_recv
                    iface_info["errors_in"] = io.errin
                    iface_info["errors_out"] = io.errout
                
                interfaces.append(iface_info)
            
            # Sort: up interfaces first, then by name
            interfaces.sort(key=lambda x: (not x['is_up'], x['name']))
            
        except Exception as e:
            logger.error(f"Error getting network interfaces: {e}")
        
        return interfaces
    
    @staticmethod
    def format_bytes(bytes_value: int) -> str:
        """Format bytes to human readable string."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if bytes_value < 1024:
                return f"{bytes_value:.1f} {unit}"
            bytes_value /= 1024
        return f"{bytes_value:.1f} PB"


network_service = NetworkService()
