from typing import Optional, List, Dict
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship, JSON, Column
import enum

# --- Enums ---
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ADMIN_READ_ONLY = "admin_readonly"
    PARTNER = "partner"
    TECHNICIAN = "technician"
    VIEWER = "viewer"

# --- Core Models ---

class UserInstance(SQLModel, table=True):
    """Many-to-Many link between User (Operator) and Instance"""
    user_id: str = Field(foreign_key="user.username", primary_key=True)
    instance_id: str = Field(foreign_key="instance.id", primary_key=True)

class User(SQLModel, table=True):
    username: str = Field(primary_key=True)
    hashed_password: str
    role: UserRole = Field(default=UserRole.VIEWER)
    is_active: bool = True
    last_login: Optional[datetime] = None
    
    # Relationships
    # Note: "Instance" string reference is used to avoid circular imports.
    # The relationship needs to be defined but might need 'sa_relationship_kwargs' if modules are separate.
    # For now, we keep the string forward reference.
    assigned_instances: List["Instance"] = Relationship(back_populates="assigned_users", link_model=UserInstance)

class SystemSettings(SQLModel, table=True):
    """Singleton table for Portal Customization (only id=1 used)"""
    id: int = Field(default=1, primary_key=True)
    company_name: str = "VPN Manager"
    support_url: Optional[str] = None
    primary_color: str = "#0054a6"
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SMTPSettings(SQLModel, table=True):
    """Singleton table for SMTP Configuration (only id=1 used)"""
    id: int = Field(default=1, primary_key=True)
    smtp_host: str
    smtp_port: int
    smtp_encryption: str = "tls"  # none, tls, ssl
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None 
    sender_email: str
    sender_name: str = "VPN Manager"
    public_url: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BackupSettings(SQLModel, table=True):
    """Singleton table for Backup Configuration (only id=1 used)"""
    id: int = Field(default=1, primary_key=True)
    enabled: bool = False
    frequency: str = "daily" # daily, weekly
    time: str = "03:00"
    
    # Remote Settings
    remote_protocol: str = "sftp" # ftp, sftp
    remote_host: str = ""
    remote_port: int = 22
    remote_user: str = ""
    remote_password: str = ""
    remote_path: str = "/"
    
    last_run_status: Optional[str] = None
    last_run_time: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
