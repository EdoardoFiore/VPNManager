"""
MADMIN Services Router

API endpoints for systemd service management.
"""
from fastapi import APIRouter, Depends, HTTPException
from core.auth.dependencies import get_current_user, require_permission
from core.auth.models import User

from .service import systemd_service

router = APIRouter(prefix="/api/services", tags=["services"])


@router.get("/{service_name}/status")
async def get_service_status(
    service_name: str,
    _user: User = Depends(require_permission("settings.view"))
):
    """
    Get the status of a systemd service.
    
    Only whitelisted services can be queried.
    """
    if not systemd_service.is_allowed(service_name):
        raise HTTPException(
            status_code=403,
            detail=f"Service '{service_name}' is not in the allowed list"
        )
    
    return systemd_service.get_status(service_name)


@router.post("/{service_name}/restart")
async def restart_service(
    service_name: str,
    _user: User = Depends(require_permission("settings.manage"))
):
    """
    Restart a systemd service.
    
    Only whitelisted services can be restarted.
    Requires settings.manage permission.
    """
    if not systemd_service.is_allowed(service_name):
        raise HTTPException(
            status_code=403,
            detail=f"Service '{service_name}' is not in the allowed list"
        )
    
    success, message = systemd_service.restart(service_name)
    
    if not success:
        raise HTTPException(status_code=500, detail=message)
    
    return {"success": True, "message": message}


@router.post("/{service_name}/start")
async def start_service(
    service_name: str,
    _user: User = Depends(require_permission("settings.manage"))
):
    """
    Start a systemd service.
    
    Only whitelisted services can be started.
    """
    if not systemd_service.is_allowed(service_name):
        raise HTTPException(
            status_code=403,
            detail=f"Service '{service_name}' is not in the allowed list"
        )
    
    success, message = systemd_service.start(service_name)
    
    if not success:
        raise HTTPException(status_code=500, detail=message)
    
    return {"success": True, "message": message}


@router.post("/{service_name}/stop")
async def stop_service(
    service_name: str,
    _user: User = Depends(require_permission("settings.manage"))
):
    """
    Stop a systemd service.
    
    Only whitelisted services can be stopped.
    """
    if not systemd_service.is_allowed(service_name):
        raise HTTPException(
            status_code=403,
            detail=f"Service '{service_name}' is not in the allowed list"
        )
    
    success, message = systemd_service.stop(service_name)
    
    if not success:
        raise HTTPException(status_code=500, detail=message)
    
    return {"success": True, "message": message}
