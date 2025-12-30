"""
MADMIN Modules Router

API endpoints for module management.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_session
from core.auth.dependencies import require_permission
from core.auth.models import User
from .models import InstalledModule, InstalledModuleResponse, ModuleInstallRequest
from .loader import module_loader

router = APIRouter(prefix="/api/modules", tags=["Modules"])


@router.get("/", response_model=List[InstalledModuleResponse])
async def list_modules(
    current_user: User = Depends(require_permission("modules.view")),
    session: AsyncSession = Depends(get_session)
):
    """List all installed modules."""
    result = await session.execute(
        select(InstalledModule).order_by(InstalledModule.name)
    )
    modules = result.scalars().all()
    
    return [
        InstalledModuleResponse(
            id=m.id,
            name=m.name,
            version=m.version,
            description=m.description,
            author=m.author,
            installed_at=m.installed_at,
            enabled=m.enabled
        )
        for m in modules
    ]


@router.get("/menu")
async def get_menu_items(
    current_user: User = Depends(require_permission("modules.view"))
):
    """Get all menu items from loaded modules for sidebar."""
    return module_loader.get_menu_items()


@router.post("/install", response_model=InstalledModuleResponse, status_code=status.HTTP_201_CREATED)
async def install_module(
    request: ModuleInstallRequest,
    current_user: User = Depends(require_permission("modules.manage")),
    session: AsyncSession = Depends(get_session)
):
    """
    Install a module from staging or URL.
    
    For now, only staging installation is supported.
    """
    if request.source != "staging":
        raise HTTPException(
            status_code=400,
            detail="Only 'staging' source is currently supported"
        )
    
    if not request.module_id:
        raise HTTPException(
            status_code=400,
            detail="module_id is required for staging installation"
        )
    
    installed = await module_loader.install_from_staging(session, request.module_id)
    
    if not installed:
        raise HTTPException(
            status_code=400,
            detail="Failed to install module. Check server logs."
        )
    
    await session.commit()
    
    return InstalledModuleResponse(
        id=installed.id,
        name=installed.name,
        version=installed.version,
        description=installed.description,
        author=installed.author,
        installed_at=installed.installed_at,
        enabled=installed.enabled
    )


@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def uninstall_module(
    module_id: str,
    current_user: User = Depends(require_permission("modules.manage")),
    session: AsyncSession = Depends(get_session)
):
    """Uninstall a module."""
    success = await module_loader.uninstall_module(session, module_id)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Module not found or uninstall failed"
        )
    
    await session.commit()


@router.patch("/{module_id}/enable")
async def enable_module(
    module_id: str,
    current_user: User = Depends(require_permission("modules.manage")),
    session: AsyncSession = Depends(get_session)
):
    """Enable a module."""
    result = await session.execute(
        select(InstalledModule).where(InstalledModule.id == module_id)
    )
    module = result.scalar_one_or_none()
    
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    module.enabled = True
    session.add(module)
    await session.commit()
    
    return {"status": "ok", "message": f"Module {module_id} enabled. Restart required."}


@router.patch("/{module_id}/disable")
async def disable_module(
    module_id: str,
    current_user: User = Depends(require_permission("modules.manage")),
    session: AsyncSession = Depends(get_session)
):
    """Disable a module."""
    result = await session.execute(
        select(InstalledModule).where(InstalledModule.id == module_id)
    )
    module = result.scalar_one_or_none()
    
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    module.enabled = False
    session.add(module)
    await session.commit()
    
    return {"status": "ok", "message": f"Module {module_id} disabled. Restart required."}
