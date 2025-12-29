import os
import shutil
import zipfile
import json
from fastapi import UploadFile, HTTPException
import logging

from backend.core.module_manager.schemas import ModuleManifest

logger = logging.getLogger("madmin.core.installer")

MODULES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "modules")
STAGING_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "staging")

class ModuleInstaller:
    async def install_from_zip(self, file: UploadFile):
        # 1. Save ZIP to temp
        temp_path = os.path.join(STAGING_DIR, "temp_upload.zip")
        os.makedirs(STAGING_DIR, exist_ok=True)
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Extract to temp folder
        extract_path = os.path.join(STAGING_DIR, "temp_extracted")
        if os.path.exists(extract_path):
            shutil.rmtree(extract_path)
            
        try:
            with zipfile.ZipFile(temp_path, 'r') as zip_ref:
                zip_ref.extractall(extract_path)
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="Invalid ZIP file")
            
        # 3. Find Manifest (Handle root folder in zip or flat zip)
        manifest_path = self._find_manifest(extract_path)
        if not manifest_path:
            raise HTTPException(status_code=400, detail="manifest.json not found in ZIP")
            
        # 4. Validate Manifest
        try:
            with open(manifest_path, "r") as f:
                data = json.load(f)
            manifest = ModuleManifest(**data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid manifest: {str(e)}")
            
        # 5. Move to Modules Dir
        # Target: backend/modules/{id}
        module_root = os.path.dirname(manifest_path)
        target_path = os.path.join(MODULES_DIR, manifest.id)
        
        if os.path.exists(target_path):
             # TODO: Handle update vs overwrite
             shutil.rmtree(target_path)
             
        shutil.move(module_root, target_path)
        
        # Cleanup
        os.remove(temp_path)
        if os.path.exists(extract_path):
             shutil.rmtree(extract_path) # Might be empty now if we moved root
             
        logger.info(f"Installed module {manifest.id} to {target_path}")
        return manifest

    def _find_manifest(self, root_dir):
        # Check root
        if os.path.exists(os.path.join(root_dir, "manifest.json")):
            return os.path.join(root_dir, "manifest.json")
        
        # Check first level subdirs (common zip structure)
        for item in os.listdir(root_dir):
            sub_path = os.path.join(root_dir, item)
            if os.path.isdir(sub_path):
                 if os.path.exists(os.path.join(sub_path, "manifest.json")):
                     return os.path.join(sub_path, "manifest.json")
        return None

installer = ModuleInstaller()
