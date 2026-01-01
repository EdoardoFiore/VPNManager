"""
MADMIN Network Router

API endpoints for network interface information.
"""
from fastapi import APIRouter, Depends
from core.auth.dependencies import get_current_user
from core.auth.models import User

from .service import network_service

router = APIRouter(prefix="/api/network", tags=["network"])


@router.get("/interfaces")
async def get_network_interfaces(
    _user: User = Depends(get_current_user)
):
    """
    Get all network interfaces with their details.
    
    Returns list of interfaces with:
    - name, IPv4, IPv6, MAC address
    - Status (up/down), speed, MTU
    - Traffic stats (bytes/packets sent/received)
    """
    interfaces = network_service.get_interfaces()
    return {"interfaces": interfaces}
