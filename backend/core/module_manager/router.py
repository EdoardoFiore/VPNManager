from typing import List
from fastapi import APIRouter, UploadFile, File, Depends
from backend.core.module_manager.loader import loader
from backend.core.module_manager.schemas import ModuleManifest
from backend.core.module_manager.installer import installer
from backend.core.auth.deps import get_current_superuser

router = APIRouter()

@router.get("/", response_model=List[ModuleManifest])
def list_modules():
    return list(loader.loaded_modules.values())

@router.post("/upload")
async def upload_module(file: UploadFile = File(...), user = Depends(get_current_superuser)):
    manifest = await installer.install_from_zip(file)
    return {"status": "installed", "module": manifest}
