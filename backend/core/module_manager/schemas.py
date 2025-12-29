from pydantic import BaseModel
from typing import List, Optional

class ModuleManifest(BaseModel):
    id: str
    name: str
    version: str
    description: str = ""
    author: Optional[str] = None
    
    # Needs
    permissions: List[str] = []
    dependencies: List[str] = []
    
    # UI
    menu_items: List[dict] = [] # TODO: Define stricter schema for menu
    
    # Hooks
    firewall_priority_default: int = 50
