from typing import Optional
from sqlmodel import SQLModel, Field

class ModuleState(SQLModel, table=True):
    """Stores the runtime state of a module (enabled/disabled, order)."""
    id: Optional[int] = Field(default=None, primary_key=True)
    
    module_id: str = Field(unique=True, index=True)
    enabled: bool = Field(default=True)
    priority: int = Field(default=100) # User-defined order for firewall/menu
