from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from backend.core.database import get_session
from backend.core.auth.deps import get_current_active_user
from backend.core.firewall.models import FirewallRule
from backend.core.firewall.manager import firewall_mgr

router = APIRouter()

@router.get("/rules", response_model=List[FirewallRule])
def get_rules(session: Session = Depends(get_session), user = Depends(get_current_active_user)):
    return session.exec(select(FirewallRule)).all()

@router.post("/rules", response_model=FirewallRule)
def create_rule(rule: FirewallRule, session: Session = Depends(get_session), user = Depends(get_current_active_user)):
    # TODO: Validate permissions
    session.add(rule)
    session.commit()
    session.refresh(rule)
    try:
        firewall_mgr.apply_rules()
    except Exception as e:
        # TODO: Rollback DB? Or just warn?
        pass
    return rule

@router.delete("/rules/{rule_id}")
def delete_rule(rule_id: int, session: Session = Depends(get_session), user = Depends(get_current_active_user)):
    rule = session.get(FirewallRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    session.delete(rule)
    session.commit()
    firewall_mgr.apply_rules()
    return {"status": "deleted"}

@router.post("/apply")
def apply_firewall_rules(user = Depends(get_current_active_user)):
    """Force re-application of rules"""
    firewall_mgr.apply_rules()
    return {"status": "applied"}
