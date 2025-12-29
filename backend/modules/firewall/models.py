from typing import Optional
from sqlmodel import Field, SQLModel, Relationship
import uuid
from backend.modules.wireguard.models import Group

class FirewallRule(SQLModel, table=True):
    """Instance/Group specific firewall rules"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    group_id: str = Field(foreign_key="group.id")
    action: str
    protocol: str
    port: Optional[str] = None
    destination: str
    description: str = ""
    order: int = 0

    group: Group = Relationship(back_populates="rules")

class MachineFirewallRule(SQLModel, table=True):
    """Global Machine Firewall Rules"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    chain: str
    action: str
    protocol: Optional[str] = None
    source: Optional[str] = None
    destination: Optional[str] = None
    port: Optional[str] = None
    in_interface: Optional[str] = None
    out_interface: Optional[str] = None
    state: Optional[str] = None
    comment: Optional[str] = None
    table_name: str = Field(default="filter", alias="table") 
    order: int = 0
