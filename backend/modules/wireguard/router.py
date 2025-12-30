"""
WireGuard Module - API Router

FastAPI endpoints for WireGuard VPN management.
"""
import logging
import io
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from core.database import get_session
from core.auth.dependencies import require_permission
from core.auth.models import User

from .models import (
    WgInstance, WgInstanceCreate, WgInstanceRead,
    WgClient, WgClientCreate, WgClientRead
)
from .service import wireguard_service, WIREGUARD_CONFIG_DIR

logger = logging.getLogger(__name__)
router = APIRouter()


# --- INSTANCES ---

@router.get("/instances", response_model=List[WgInstanceRead])
async def list_instances(
    db: AsyncSession = Depends(get_session),
    _user: User = Depends(require_permission("wireguard.view"))
):
    """List all WireGuard instances."""
    result = await db.execute(select(WgInstance))
    instances = result.scalars().all()
    
    response = []
    for inst in instances:
        count = await db.execute(
            select(func.count()).where(WgClient.instance_id == inst.id)
        )
        response.append(WgInstanceRead(
            id=inst.id, name=inst.name, port=inst.port, subnet=inst.subnet,
            interface=inst.interface, public_key=inst.public_key,
            tunnel_mode=inst.tunnel_mode, routes=inst.routes,
            dns_servers=inst.dns_servers,
            firewall_default_policy=inst.firewall_default_policy,
            status="running" if wireguard_service.get_interface_status(inst.interface) else "stopped",
            client_count=count.scalar() or 0
        ))
    return response


@router.post("/instances", response_model=WgInstanceRead, status_code=201)
async def create_instance(
    data: WgInstanceCreate,
    db: AsyncSession = Depends(get_session),
    _user: User = Depends(require_permission("wireguard.manage"))
):
    """Create new WireGuard instance."""
    interface_name = f"wg_{data.name.lower().replace(' ', '_')[:10]}"
    
    existing = await db.execute(
        select(WgInstance).where(
            (WgInstance.port == data.port) | (WgInstance.interface == interface_name)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Porta o interfaccia già in uso")
    
    private_key, public_key = wireguard_service.generate_keypair()
    
    from ipaddress import ip_network
    network = ip_network(data.subnet, strict=False)
    server_ip = str(list(network.hosts())[0])
    
    instance = WgInstance(
        id=interface_name, name=data.name, port=data.port,
        subnet=data.subnet, interface=interface_name,
        private_key=private_key, public_key=public_key,
        tunnel_mode=data.tunnel_mode, routes=data.routes,
        dns_servers=data.dns_servers
    )
    db.add(instance)
    
    config = wireguard_service.create_server_config(
        interface_name, data.port, private_key, f"{server_ip}/{network.prefixlen}"
    )
    config_path = WIREGUARD_CONFIG_DIR / f"{interface_name}.conf"
    config_path.write_text(config)
    config_path.chmod(0o600)
    
    await db.commit()
    
    return WgInstanceRead(
        id=instance.id, name=instance.name, port=instance.port,
        subnet=instance.subnet, interface=instance.interface,
        public_key=instance.public_key, tunnel_mode=instance.tunnel_mode,
        routes=instance.routes, dns_servers=instance.dns_servers,
        firewall_default_policy=instance.firewall_default_policy,
        status="stopped", client_count=0
    )


@router.get("/instances/{instance_id}", response_model=WgInstanceRead)
async def get_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_session),
    _user: User = Depends(require_permission("wireguard.view"))
):
    """Get a single WireGuard instance by ID."""
    result = await db.execute(select(WgInstance).where(WgInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(404, "Istanza non trovata")
    
    count = await db.execute(
        select(func.count()).where(WgClient.instance_id == instance.id)
    )
    
    return WgInstanceRead(
        id=instance.id, name=instance.name, port=instance.port,
        subnet=instance.subnet, interface=instance.interface,
        public_key=instance.public_key, tunnel_mode=instance.tunnel_mode,
        routes=instance.routes, dns_servers=instance.dns_servers,
        firewall_default_policy=instance.firewall_default_policy,
        status="running" if wireguard_service.get_interface_status(instance.interface) else "stopped",
        client_count=count.scalar() or 0
    )


@router.delete("/instances/{instance_id}", status_code=204)
async def delete_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_session),
    _user: User = Depends(require_permission("wireguard.manage"))
):
    """Delete WireGuard instance."""
    result = await db.execute(select(WgInstance).where(WgInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(404, "Istanza non trovata")
    
    wireguard_service.stop_interface(instance.interface)
    config_path = WIREGUARD_CONFIG_DIR / f"{instance.interface}.conf"
    if config_path.exists():
        config_path.unlink()
    
    await db.delete(instance)
    await db.commit()


@router.post("/instances/{instance_id}/start")
async def start_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_session),
    _user: User = Depends(require_permission("wireguard.manage"))
):
    """Start WireGuard instance."""
    result = await db.execute(select(WgInstance).where(WgInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(404, "Istanza non trovata")
    
    if wireguard_service.start_interface(instance.interface):
        return {"status": "running"}
    raise HTTPException(500, "Impossibile avviare istanza")


@router.post("/instances/{instance_id}/stop")
async def stop_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_session),
    _user: User = Depends(require_permission("wireguard.manage"))
):
    """Stop WireGuard instance."""
    result = await db.execute(select(WgInstance).where(WgInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(404, "Istanza non trovata")
    
    if wireguard_service.stop_interface(instance.interface):
        return {"status": "stopped"}
    raise HTTPException(500, "Impossibile fermare istanza")


# --- CLIENTS ---

@router.get("/instances/{instance_id}/clients", response_model=List[WgClientRead])
async def list_clients(
    instance_id: str,
    db: AsyncSession = Depends(get_session),
    _user: User = Depends(require_permission("wireguard.view"))
):
    """List clients for an instance."""
    result = await db.execute(
        select(WgClient).where(WgClient.instance_id == instance_id)
    )
    return [WgClientRead(
        id=c.id, name=c.name, allocated_ip=c.allocated_ip,
        public_key=c.public_key, created_at=c.created_at,
        last_handshake=c.last_handshake
    ) for c in result.scalars().all()]


@router.post("/instances/{instance_id}/clients", response_model=WgClientRead, status_code=201)
async def create_client(
    instance_id: str,
    data: WgClientCreate,
    db: AsyncSession = Depends(get_session),
    _user: User = Depends(require_permission("wireguard.clients"))
):
    """Create new client."""
    result = await db.execute(select(WgInstance).where(WgInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(404, "Istanza non trovata")
    
    existing = await db.execute(
        select(WgClient).where(
            (WgClient.instance_id == instance_id) & (WgClient.name == data.name)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Nome client già esistente")
    
    private_key, public_key = wireguard_service.generate_keypair()
    psk = wireguard_service.generate_psk()
    allocated_ip = await wireguard_service.allocate_client_ip(db, instance)
    
    client = WgClient(
        instance_id=instance_id, name=data.name,
        private_key=private_key, public_key=public_key,
        preshared_key=psk, allocated_ip=allocated_ip
    )
    db.add(client)
    
    config_path = WIREGUARD_CONFIG_DIR / f"{instance.interface}.conf"
    wireguard_service.add_peer_to_config(config_path, public_key, psk, allocated_ip, data.name)
    
    if wireguard_service.get_interface_status(instance.interface):
        wireguard_service.hot_reload_interface(instance.interface)
    
    await db.commit()
    
    return WgClientRead(
        id=client.id, name=client.name, allocated_ip=client.allocated_ip,
        public_key=client.public_key, created_at=client.created_at,
        last_handshake=client.last_handshake
    )


@router.delete("/instances/{instance_id}/clients/{client_name}", status_code=204)
async def delete_client(
    instance_id: str,
    client_name: str,
    db: AsyncSession = Depends(get_session),
    _user: User = Depends(require_permission("wireguard.clients"))
):
    """Delete (revoke) client."""
    result = await db.execute(select(WgInstance).where(WgInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(404, "Istanza non trovata")
    
    result = await db.execute(
        select(WgClient).where(
            (WgClient.instance_id == instance_id) & (WgClient.name == client_name)
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(404, "Client non trovato")
    
    config_path = WIREGUARD_CONFIG_DIR / f"{instance.interface}.conf"
    wireguard_service.remove_peer_from_config(config_path, client.public_key)
    
    if wireguard_service.get_interface_status(instance.interface):
        wireguard_service.hot_reload_interface(instance.interface)
    
    await db.delete(client)
    await db.commit()


@router.get("/instances/{instance_id}/clients/{client_name}/config")
async def get_client_config(
    instance_id: str,
    client_name: str,
    db: AsyncSession = Depends(get_session),
    _user: User = Depends(require_permission("wireguard.clients"))
):
    """Download client config."""
    result = await db.execute(select(WgInstance).where(WgInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(404, "Istanza non trovata")
    
    result = await db.execute(
        select(WgClient).where(
            (WgClient.instance_id == instance_id) & (WgClient.name == client_name)
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(404, "Client non trovato")
    
    from core.settings.models import SmtpSettings
    smtp = await db.execute(select(SmtpSettings).where(SmtpSettings.id == 1))
    smtp_settings = smtp.scalar_one_or_none()
    endpoint = smtp_settings.public_url if smtp_settings and smtp_settings.public_url else "YOUR_SERVER_IP"
    
    config = wireguard_service.generate_client_config(instance, client, endpoint)
    
    return Response(
        content=config, media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={client_name}.conf"}
    )


@router.get("/instances/{instance_id}/clients/{client_name}/qr")
async def get_client_qr(
    instance_id: str,
    client_name: str,
    db: AsyncSession = Depends(get_session),
    _user: User = Depends(require_permission("wireguard.clients"))
):
    """Get QR code for client config."""
    result = await db.execute(select(WgInstance).where(WgInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(404, "Istanza non trovata")
    
    result = await db.execute(
        select(WgClient).where(
            (WgClient.instance_id == instance_id) & (WgClient.name == client_name)
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(404, "Client non trovato")
    
    from core.settings.models import SmtpSettings
    smtp = await db.execute(select(SmtpSettings).where(SmtpSettings.id == 1))
    smtp_settings = smtp.scalar_one_or_none()
    endpoint = smtp_settings.public_url if smtp_settings and smtp_settings.public_url else "YOUR_SERVER_IP"
    
    config = wireguard_service.generate_client_config(instance, client, endpoint)
    qr_bytes = wireguard_service.generate_qr_code(config)
    
    return StreamingResponse(io.BytesIO(qr_bytes), media_type="image/png")
