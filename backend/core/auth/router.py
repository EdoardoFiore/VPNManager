from datetime import timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from pydantic import BaseModel

from backend.core.database import get_session
from backend.core.auth import utils, models, deps

router = APIRouter()

# -- Pydantic Schemas for Requests --
class PermissionAssignRequest(BaseModel):
    user_id: int
    permission_ids: List[int]

class UserCreate(BaseModel):
    username: str
    password: str
    is_superuser: bool = False
    is_active: bool = True

class UserRead(BaseModel):
    id: int
    username: str
    is_active: bool
    is_superuser: bool
    permissions: List[models.Permission] = []


@router.post("/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    statement = select(models.User).where(models.User.username == form_data.username)
    user = session.exec(statement).first()
    
    if not user or not utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserRead)
def read_users_me(current_user: models.User = Depends(deps.get_current_active_user)):
    return current_user

# --- Permission Management ---

@router.get("/permissions", response_model=List[models.Permission])
def list_permissions(session: Session = Depends(get_session), user: models.User = Depends(deps.get_current_superuser)):
    return session.exec(select(models.Permission)).all()

@router.post("/permissions/assign")
def assign_permissions(req: PermissionAssignRequest, session: Session = Depends(get_session), admin: models.User = Depends(deps.get_current_superuser)):
    user = session.get(models.User, req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Clear existing? Or additive? For simplified UI, we replace.
    # SQLModel doesn't support bulk delete on M2M easily without direct delete query on link table.
    
    # 1. Clear existing links
    links = session.exec(select(models.UserPermissionLink).where(models.UserPermissionLink.user_id == req.user_id)).all()
    for link in links:
        session.delete(link)
    
    # 2. Add new
    for pid in req.permission_ids:
        link = models.UserPermissionLink(user_id=req.user_id, permission_id=pid)
        session.add(link)
    
    session.commit()
    return {"status": "assigned"}


# --- User CRUD ---

@router.get("/", response_model=List[UserRead])
def list_users(session: Session = Depends(get_session), user: models.User = Depends(deps.get_current_superuser)):
    return session.exec(select(models.User)).all()

@router.post("/", response_model=UserRead)
def create_user(user_in: UserCreate, session: Session = Depends(get_session), admin: models.User = Depends(deps.get_current_superuser)):
    # Check existing
    existing = session.exec(select(models.User).where(models.User.username == user_in.username)).first()
    if existing:
         raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create DB User
    db_user = models.User(
        username=user_in.username,
        hashed_password=utils.get_password_hash(user_in.password),
        is_superuser=user_in.is_superuser,
        is_active=user_in.is_active
    )
    
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session), admin: models.User = Depends(deps.get_current_superuser)):
    user = session.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
        
    session.delete(user)
    session.commit()
    return {"status": "deleted"}
