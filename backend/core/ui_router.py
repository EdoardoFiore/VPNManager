from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.core.database import get_session
from backend.core.auth import deps, models
from backend.core.module_manager.loader import loader

router = APIRouter()


class MenuItem(BaseModel):
    label: Optional[str] = None
    url: Optional[str] = None
    icon: Optional[str] = None
    header: Optional[str] = None # If set, this is a section header
    children: List['MenuItem'] = []

@router.get("/menu", response_model=List[MenuItem])
def get_menu(
    current_user: models.User = Depends(deps.get_current_active_user),
    session: Session = Depends(get_session)
):
    menu = []
    
    # 1. Dashboard
    menu.append(MenuItem(label="Dashboard", url="dashboard", icon="home"))
    
    # 2. Core Section
    if current_user.is_superuser:
        menu.append(MenuItem(header="Core System"))
        menu.append(MenuItem(label="Users", url="users", icon="users"))
        menu.append(MenuItem(label="Machine Firewall", url="firewall", icon="shield-lock"))
        menu.append(MenuItem(label="Modules", url="modules", icon="package"))
        
    # 3. Dynamic Modules
    modules = loader.loaded_modules
    if modules:
        menu.append(MenuItem(header="Installed Modules"))
        for mod_id, mod in modules.items():
            # Check permissions if module defines them (TODO)
            # For now, show all loaded modules the user has access to
            
            # Helper to generate menu from manifest
            if hasattr(mod, 'manifest') and mod.manifest.menu_items:
                for item in mod.manifest.menu_items:
                     menu.append(MenuItem(
                         label=item.label,
                         url=f"module/{mod_id}/{item.path}", # Frontend router will handle this prefix
                         icon=item.icon,
                         children=[] # TODO recursive
                     ))
            else:
                # Fallback if no menu_items defined but module exists
                menu.append(MenuItem(label=mod.manifest.name, url=f"module/{mod_id}", icon="box"))

    return menu
