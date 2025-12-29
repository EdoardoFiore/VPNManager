from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class WGInstance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    
    # Network
    interface: str = Field(unique=True) # wg0
    port: int = Field(unique=True)
    subnet: str # 10.0.0.0/24
    
    # Crypto
    private_key: str
    public_key: str
    
    # System
    is_running: bool = Field(default=False)
    
    peers: List["WGPeer"] = Relationship(back_populates="instance")

class WGPeer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    
    public_key: str
    preshared_key: Optional[str] = None
    
    allowed_ips: str # 10.0.0.2/32
    
    instance_id: Optional[int] = Field(default=None, foreign_key="wginstance.id")
    instance: Optional[WGInstance] = Relationship(back_populates="peers")
