from typing import Optional, List, Dict
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship, JSON, Column
import uuid
# Import Core Models for Link
from backend.core.models import User, UserInstance

class InstanceBase(SQLModel):
    name: str
    port: int = Field(unique=True)
    subnet: str = Field(unique=True)
    interface: str = Field(unique=True)
    tunnel_mode: str = "full"
    routes: List[Dict] = Field(default=[], sa_column=Column(JSON))
    dns_servers: List[str] = Field(default=["8.8.8.8", "1.1.1.1"], sa_column=Column(JSON))
    firewall_default_policy: str = "ACCEPT"
    status: str = "stopped"
    type: str = "wireguard"

class Instance(InstanceBase, table=True):
    id: str = Field(primary_key=True)
    private_key: str
    public_key: str
    
    # Relationships
    clients: List["Client"] = Relationship(back_populates="instance", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    groups: List["Group"] = Relationship(back_populates="instance", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    assigned_users: List[User] = Relationship(back_populates="assigned_instances", link_model=UserInstance)

class InstanceRead(InstanceBase):
    id: str
    public_key: str
    connected_clients: int = 0

class Client(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    instance_id: str = Field(foreign_key="instance.id")
    name: str
    private_key: str
    public_key: str
    preshared_key: str
    allocated_ip: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    instance: Instance = Relationship(back_populates="clients")
    group_links: List["GroupMember"] = Relationship(back_populates="client", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class Group(SQLModel, table=True):
    id: str = Field(primary_key=True) # e.g. "amministrazione_devs"
    instance_id: str = Field(foreign_key="instance.id")
    name: str
    description: str = ""

    # Relationships
    instance: Instance = Relationship(back_populates="groups")
    client_links: List["GroupMember"] = Relationship(back_populates="group", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    rules: List["FirewallRule"] = Relationship(back_populates="group", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class GroupRead(SQLModel):
    id: str
    instance_id: str
    name: str
    description: str
    members: List[str] = []

class GroupMember(SQLModel, table=True):
    """Junction table for Many-to-Many between Groups and Clients"""
    group_id: str = Field(foreign_key="group.id", primary_key=True)
    client_id: uuid.UUID = Field(foreign_key="client.id", primary_key=True)

    group: Group = Relationship(back_populates="client_links")
    client: Client = Relationship(back_populates="group_links")

class MagicToken(SQLModel, table=True):
    """Temporary token for public access to client configuration"""
    token: str = Field(primary_key=True)
    client_id: uuid.UUID = Field(foreign_key="client.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    used: bool = False
