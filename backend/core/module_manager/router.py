from typing import List
from fastapi import APIRouter
from backend.core.module_manager.loader import loader
from backend.core.module_manager.schemas import ModuleManifest

router = APIRouter()

@router.get("/", response_model=List[ModuleManifest])
def list_modules():
    return list(loader.loaded_modules.values())
