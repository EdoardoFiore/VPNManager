from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum

class FirewallAction(str, Enum):
    ACCEPT = "ACCEPT"
    DROP = "DROP"
    REJECT = "REJECT"

class FirewallRule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Core Identification
    chain_name: str # INPUT, OUTPUT, FORWARD, or custom
    table: str = Field(default="filter") # filter, nat, mangle, raw
    priority: int = Field(default=100)
    enabled: bool = Field(default=True)
    
    # Matchers
    protocol: Optional[str] = None # tcp, udp, icmp
    port: Optional[str] = None # 80, 443
    source: Optional[str] = None
    destination: Optional[str] = None
    in_interface: Optional[str] = None
    out_interface: Optional[str] = None
    state: Optional[str] = None # NEW, ESTABLISHED
    
    # Action
    action: str = "ACCEPT" # ACCEPT, DROP, REJECT, LOG
    
    description: Optional[str] = None
    
    # Is this a "System" rule (created by a module) or a "User" rule?
    # User rules are editable in the UI. Module rules might be read-only there.
    owner_module: Optional[str] = Field(default=None) # e.g. "wireguard", "user"
