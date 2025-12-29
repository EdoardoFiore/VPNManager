from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime

# Join Table for Many-to-Many
class UserPermissionLink(SQLModel, table=True):
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", primary_key=True)
    permission_id: Optional[int] = Field(default=None, foreign_key="permission.id", primary_key=True)

class Permission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, index=True) # e.g. "vpn.manage"
    description: str

    users: List["User"] = Relationship(back_populates="permissions", link_model=UserPermissionLink)

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    permissions: List[Permission] = Relationship(back_populates="users", link_model=UserPermissionLink)
