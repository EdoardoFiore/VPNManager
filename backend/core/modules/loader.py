"""
MADMIN Module Loader

Handles discovery, loading, and initialization of installed modules.
"""
import os
import json
import logging
import importlib.util
import shutil
from pathlib import Path
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles

from config import get_settings
from .models import InstalledModule, ModuleManifest, ModulePermission

logger = logging.getLogger(__name__)
settings = get_settings()


class ModuleLoader:
    """
    Discovers and loads installed modules.
    
    Modules are loaded from the modules directory and can provide:
    - FastAPI router for backend endpoints
    - Static files for frontend
    - Permissions for access control
    - Firewall chain definitions
    """
    
    def __init__(self):
        self.loaded_modules: Dict[str, Dict[str, Any]] = {}
        self.modules_dir = Path(settings.modules_dir)
        self.staging_dir = Path(settings.staging_dir)
    
    def _parse_manifest(self, manifest_path: Path) -> Optional[ModuleManifest]:
        """Parse and validate a module's manifest.json."""
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return ModuleManifest(**data)
        except FileNotFoundError:
            logger.error(f"Manifest not found: {manifest_path}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in manifest {manifest_path}: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to parse manifest {manifest_path}: {e}")
            return None
    
    def discover_modules(self) -> List[str]:
        """
        Discover all installed modules by scanning the modules directory.
        Returns list of module IDs.
        """
        modules = []
        
        if not self.modules_dir.exists():
            logger.warning(f"Modules directory does not exist: {self.modules_dir}")
            return modules
        
        for item in self.modules_dir.iterdir():
            if item.is_dir():
                manifest_path = item / "manifest.json"
                if manifest_path.exists():
                    modules.append(item.name)
        
        return modules
    
    def load_module_router(self, module_id: str, manifest: ModuleManifest) -> Optional[APIRouter]:
        """
        Load a module's FastAPI router.
        
        Args:
            module_id: Module identifier
            manifest: Parsed module manifest
        
        Returns:
            FastAPI APIRouter or None if loading fails
        """
        module_path = self.modules_dir / module_id
        router_file = module_path / manifest.backend_router
        
        if not router_file.exists():
            logger.warning(f"Router file not found for module {module_id}: {router_file}")
            return None
        
        try:
            # Dynamic import of module router
            spec = importlib.util.spec_from_file_location(
                f"modules.{module_id}.router",
                router_file
            )
            if spec is None or spec.loader is None:
                return None
            
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            if hasattr(module, "router"):
                return module.router
            else:
                logger.warning(f"Module {module_id} router.py has no 'router' attribute")
                return None
                
        except Exception as e:
            logger.error(f"Failed to load router for module {module_id}: {e}")
            return None
    
    async def register_module_permissions(
        self,
        session: AsyncSession,
        module_id: str,
        permissions: List[ModulePermission]
    ) -> None:
        """Register a module's permissions in the database."""
        from core.auth.models import Permission
        
        for perm in permissions:
            result = await session.execute(
                select(Permission).where(Permission.slug == perm.slug)
            )
            existing = result.scalar_one_or_none()
            
            if not existing:
                permission = Permission(
                    slug=perm.slug,
                    description=perm.description,
                    module_id=module_id
                )
                session.add(permission)
                logger.info(f"Registered permission {perm.slug} for module {module_id}")
    
    async def register_module_chains(
        self,
        session: AsyncSession,
        module_id: str,
        manifest: ModuleManifest
    ) -> None:
        """Register a module's firewall chains."""
        from core.firewall.orchestrator import firewall_orchestrator
        
        for chain_def in manifest.firewall_chains:
            await firewall_orchestrator.register_module_chain(
                session=session,
                module_id=module_id,
                chain_name=chain_def.name,
                parent_chain=chain_def.parent,
                priority=chain_def.priority
            )
    
    async def load_module(
        self,
        app: FastAPI,
        session: AsyncSession,
        module_id: str
    ) -> bool:
        """
        Load a single module and register its components.
        
        Args:
            app: FastAPI application instance
            session: Database session
            module_id: Module identifier
        
        Returns:
            True if loaded successfully
        """
        module_path = self.modules_dir / module_id
        manifest_path = module_path / "manifest.json"
        
        manifest = self._parse_manifest(manifest_path)
        if not manifest:
            return False
        
        # Load router
        router = self.load_module_router(module_id, manifest)
        if router:
            # Mount router under /api/modules/{module_id}/
            app.include_router(
                router,
                prefix=f"/api/modules/{module_id}",
                tags=[manifest.name]
            )
            logger.info(f"Mounted router for module {module_id}")
        
        # Mount static files
        static_path = module_path / manifest.static_dir
        if static_path.exists():
            app.mount(
                f"/static/modules/{module_id}",
                StaticFiles(directory=str(static_path)),
                name=f"static_{module_id}"
            )
            logger.info(f"Mounted static files for module {module_id}")
        
        # Register permissions
        await self.register_module_permissions(session, module_id, manifest.permissions)
        
        # Register firewall chains
        await self.register_module_chains(session, module_id, manifest)
        
        # Store in loaded modules
        self.loaded_modules[module_id] = {
            "manifest": manifest,
            "router": router,
            "path": str(module_path)
        }
        
        logger.info(f"Successfully loaded module: {module_id} v{manifest.version}")
        return True
    
    async def load_all_modules(self, app: FastAPI, session: AsyncSession) -> int:
        """
        Discover and load all installed modules.
        
        Returns:
            Number of modules loaded
        """
        module_ids = self.discover_modules()
        loaded_count = 0
        
        for module_id in module_ids:
            # Check if module is enabled in DB
            result = await session.execute(
                select(InstalledModule).where(InstalledModule.id == module_id)
            )
            db_module = result.scalar_one_or_none()
            
            if db_module and not db_module.enabled:
                logger.info(f"Skipping disabled module: {module_id}")
                continue
            
            if await self.load_module(app, session, module_id):
                loaded_count += 1
        
        logger.info(f"Loaded {loaded_count}/{len(module_ids)} modules")
        return loaded_count
    
    def get_menu_items(self) -> List[Dict]:
        """
        Get all menu items from loaded modules.
        Used by frontend to build dynamic sidebar.
        """
        items = []
        for module_id, data in self.loaded_modules.items():
            manifest: ModuleManifest = data["manifest"]
            for menu_item in manifest.menu:
                items.append({
                    "module_id": module_id,
                    "label": menu_item.label,
                    "icon": menu_item.icon,
                    "route": menu_item.route
                })
        return items
    
    async def install_from_staging(
        self,
        session: AsyncSession,
        module_id: str
    ) -> Optional[InstalledModule]:
        """
        Install a module from the staging directory.
        
        Args:
            session: Database session
            module_id: Module identifier in staging
        
        Returns:
            InstalledModule record or None on failure
        """
        staging_path = self.staging_dir / module_id
        manifest_path = staging_path / "manifest.json"
        
        if not staging_path.exists():
            logger.error(f"Module {module_id} not found in staging")
            return None
        
        manifest = self._parse_manifest(manifest_path)
        if not manifest:
            return None
        
        # Check if already installed
        result = await session.execute(
            select(InstalledModule).where(InstalledModule.id == module_id)
        )
        if result.scalar_one_or_none():
            logger.error(f"Module {module_id} is already installed")
            return None
        
        # Copy to modules directory
        target_path = self.modules_dir / module_id
        try:
            shutil.copytree(staging_path, target_path)
        except Exception as e:
            logger.error(f"Failed to copy module {module_id}: {e}")
            return None
        
        # Create database record
        installed = InstalledModule(
            id=manifest.id,
            name=manifest.name,
            version=manifest.version,
            description=manifest.description,
            author=manifest.author,
            install_path=str(target_path),
            manifest_json=json.dumps(manifest.model_dump())
        )
        session.add(installed)
        
        logger.info(f"Installed module {module_id} from staging")
        return installed
    
    async def uninstall_module(
        self,
        session: AsyncSession,
        module_id: str
    ) -> bool:
        """
        Uninstall a module.
        Removes files and database records.
        """
        result = await session.execute(
            select(InstalledModule).where(InstalledModule.id == module_id)
        )
        db_module = result.scalar_one_or_none()
        
        if not db_module:
            logger.error(f"Module {module_id} not found in database")
            return False
        
        # Remove firewall chains
        from core.firewall.models import ModuleChain
        await session.execute(
            ModuleChain.__table__.delete().where(ModuleChain.module_id == module_id)
        )
        
        # Remove permissions
        from core.auth.models import Permission
        await session.execute(
            Permission.__table__.delete().where(Permission.module_id == module_id)
        )
        
        # Remove database record
        await session.delete(db_module)
        
        # Remove files
        module_path = Path(db_module.install_path)
        if module_path.exists():
            try:
                shutil.rmtree(module_path)
            except Exception as e:
                logger.error(f"Failed to remove module files: {e}")
        
        # Remove from loaded modules
        if module_id in self.loaded_modules:
            del self.loaded_modules[module_id]
        
        logger.info(f"Uninstalled module {module_id}")
        return True


# Singleton instance
module_loader = ModuleLoader()
