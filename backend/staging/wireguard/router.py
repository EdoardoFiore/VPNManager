from fastapi import APIRouter
from typing import List

router = APIRouter()

@router.get("/instances")
def list_instances():
    return [{"name": "wg0", "status": "simulated"}]

@router.post("/instances")
def create_instance():
    return {"status": "created", "warning": "This is a staging module implementation"}
