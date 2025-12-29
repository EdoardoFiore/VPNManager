from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum

class FirewallAction(str, Enum):
    ACCEPT = "ACCEPT"
    DROP = "DROP"
    REJECT = "REJECT"

class FirewallRule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # "INPUT", "OUTPUT", "FORWARD" (or "MADMIN_INPUT", etc.)
    chain_name: str = Field(index=True)
    
    priority: int = Field(default=100, index=True) # Lower = Earlier
    
    protocol: str # tcp, udp, icmp, any
    port: Optional[str] = None # 80, 80:90, or None
    source: Optional[str] = None # CIDR
    destination: Optional[str] = None # CIDR
    action: FirewallAction = Field(default=FirewallAction.ACCEPT)
    
    description: Optional[str] = None
    enabled: bool = Field(default=True)
    
    # Is this a "System" rule (created by a module) or a "User" rule?
    # User rules are editable in the UI. Module rules might be read-only there.
    owner_module: Optional[str] = Field(default=None) # e.g. "wireguard", "user"
