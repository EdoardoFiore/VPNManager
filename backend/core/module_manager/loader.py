import os
import json
import importlib
import logging
from typing import List, Dict
from fastapi import FastAPI
from sqlmodel import Session, select

from backend.core.database import engine
from backend.core.module_manager.schemas import ModuleManifest
from backend.core.module_manager.models import ModuleState

logger = logging.getLogger("madmin.core.loader")

MODULES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "modules")

class ModuleLoader:
    def __init__(self):
        self.loaded_modules: Dict[str, ModuleManifest] = {}

    def discover_and_load(self, app: FastAPI):
        """Scans modules dir and loads enabled modules."""
        logger.info(f"Scanning for modules in {MODULES_DIR} ...")
        
        if not os.path.exists(MODULES_DIR):
            logger.warning("Modules directory not found.")
            return

        with Session(engine) as session:
            # Get states
            states = {s.module_id: s for s in session.exec(select(ModuleState)).all()}

            for item in os.listdir(MODULES_DIR):
                mod_path = os.path.join(MODULES_DIR, item)
                manifest_path = os.path.join(mod_path, "manifest.json")
                
                if os.path.isdir(mod_path) and os.path.exists(manifest_path):
                    try:
                        # 1. Read Manifest
                        with open(manifest_path, "r") as f:
                            data = json.load(f)
                        manifest = ModuleManifest(**data)
                        
                        # 2. Check State
                        state = states.get(manifest.id)
                        if not state:
                            # New module found, create default state
                            state = ModuleState(module_id=manifest.id, enabled=True, priority=manifest.firewall_priority_default)
                            session.add(state)
                            session.commit() # Commit immediately to have ID
                            states[manifest.id] = state

                        if state.enabled:
                            self._load_module(app, manifest)
                        else:
                            logger.info(f"Module {manifest.id} is disabled. Skipping.")
                            
                    except Exception as e:
                        logger.error(f"Failed to load module {item}: {e}")

    def _load_module(self, app: FastAPI, manifest: ModuleManifest):
        logger.info(f"Loading Module: {manifest.name} ({manifest.id})")
        
        # 1. Mount Router
        try:
            # Dynamic import: backend.modules.{id}.router
            router_module = importlib.import_module(f"backend.modules.{manifest.id}.router")
            if hasattr(router_module, "router"):
                app.include_router(
                    router_module.router, 
                    prefix=f"/api/modules/{manifest.id}", 
                    tags=[f"Module: {manifest.name}"]
                )
                logger.info(f"Mounted router for {manifest.id}")
        except ModuleNotFoundError:
            # It's okay if a module doesn't have a router (maybe just firewall rules?)
            pass
        except Exception as e:
            logger.error(f"Error mounting router for {manifest.id}: {e}")
            return

        # 2. Register Permissions (TODO)
        # 3. Register Firewall Hooks (TODO)
        
        self.loaded_modules[manifest.id] = manifest

loader = ModuleLoader()
