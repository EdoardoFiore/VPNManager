# MadMin Module System Architecture

## Overview
The MadMin backend (formerly VPN Manager) uses a modular architecture to allow easy extension and maintenance.
The system is divided into:
- **Core**: Essential services (Auth, Database, System Utils, generic Script handling).
- **Modules**: Feature-specific packages (WireGuard, Firewall, etc.).

## Directory Structure
```
backend/
├── core/               # Shared utilities
├── modules/
│   ├── wireguard/      # WireGuard VPN handling
│   │   ├── models.py   # Module SQLModel definitions
│   │   ├── services/   # Business logic
│   │   └── api/        # (Future) dedicated API routers
│   └── firewall/       # Global firewall management
└── main.py             # App Entrypoint
```

## How to Create a New Module
1. Create a directory `backend/modules/my_module`.
2. Create `__init__.py`.
3. Create `models.py` (optional): Define database models here.
   - **Crucial**: Import these models in `backend/main.py` or `backend/core/database.py` (during init) so SQLModel/Alembic detect them.
4. Create `services/`: Add your business logic classes/functions.

## Module Registry (Future Plan)
Currently, modules are wired manually in `main.py` and `setup-vpn-manager.sh`. 
A future "Module Registry" system will automate:
1. **Discovery**: Automatically finding modules in `backend/modules/`.
2. **Installation**: Running a `install.sh` or `setup.py` inside each module folder to install system dependencies (apt, pip).
3. **Routing**: Automatically mounting `api_router` from each module.
4. **Menus**: Registering frontend menu items dynamically.

## Current Missing Installation Points
When adding a module today, you must manually:
1. Add any system dependencies (apt/pip) to the main `scripts/setup-vpn-manager.sh` or `requirements.txt`.
2. Register API routers in `backend/main.py`.
3. Add frontend UI files to `frontend/` manually.

## Database Migration
Adding new models requires generating a migration or letting `SQLModel.metadata.create_all(engine)` run at startup (current behavior).
