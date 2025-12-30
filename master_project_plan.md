# MADmin Project Master Plan

## 1. Vision & Philosophy
The goal is to rebuild "MADmin" as a **minimal, modular kernel**.
*   **Kernel (Core)**: Minimal generic OS: Auth, Settings, Module Loader, and System Firewall.
*   **User Space (Modules)**: All business logic (VPN, Hosting, etc.) resides here.
*   **Installation**: Modules are "plugged in" to the Kernel.

## 2. Architecture Overview

### 2.1 Backend (Python/FastAPI)
The backend manages the core logic and module orchestration.
*   **Structure**:
    ```text
    backend/
    ├── main.py                 # FastAPI Factory & Module Loader
    ├── core/                   # THE KERNEL
    │   ├── auth/               # Permission-based Auth (Superuser + Granular Permissions)
    │   ├── firewall/           # MACHINE FIREWALL & Orchestrator (FW_ chains)
    │   ├── module_manager/     # Logic to load/install/order modules
    │   └── database.py         # PostgreSQL Connection (Async)
    ├── modules/                # INSTALLED modules live here (e.g., wireguard/)
    └── staging/                # FACTORY for new modules (development area)
    ```
*   **Database**: **PostgreSQL** (required for concurrency and complex module data).

### 2.2 Frontend (Vanilla JS + ES Modules)
The frontend is a modular Single Page Application (SPA), avoiding huge monolithic files.
*   **Architecture**: Native ES Modules (`type="module"`).
*   **Structure**:
    ```text
    frontend/
    ├── index.html              # Entry point (Layout skeleton)
    └── assets/js/
        ├── app.js              # Main Loader (Router & Module Importer)
        ├── api.js              # Shared API client (Auth headers, fetch wrappers)
        └── views/              # Page Logic (Each file = One Page)
            ├── dashboard.js
            ├── users.js
            ├── firewall.js     # Machine Firewall UI
            └── modules.js      # Module Management UI
    ```
*   **Routing**: `app.js` maps URL hashes (e.g., `#users`) to dynamic imports (`import('./views/users.js')`).
*   **Module UI**: Modules provide their own views (e.g., `/api/modules/wireguard/static/settings.js`) which the Core frontend loads dynamically.

## 3. Core Features Specifications

### 3.1 Authentication
*   **Permissions**: Granular slugs (e.g., `vpn.manage`, `firewall.edit`).
*   **Users**: Superusers have all permissions; others have assigned sets.

### 3.2 Firewall Orchestrator (Machine Firewall)
*   **Concept**: Manages raw `iptables` chains for the host (Input/Output/Forward).
*   **Chains**:
    *   `FW_INPUT`, `FW_OUTPUT`, `FW_FORWARD` (Managed by Core).
    *   **Module Hooks**: Modules (like WireGuard) insert jumps *before* the Core chains (e.g., `input` -> `MOD_WIREGUARD` -> `FW_INPUT`).
*   **Persistence**: Rules saved in DB, applied on startup via `initialize_chains()`.

### 3.3 Module Manager
*   **Manifest (`manifest.json`)**: Defines ID, Permissions, Dependencies, and Menu Items.
*   **lifecycle**:
    1.  **Upload/Import**: Zip upload or Local Import from `staging/`.
    2.  **Install**: Extract to `modules/`, run Alembic migrations.
    3.  **Load**: `main.py` discovers and includes Routers/Static files.

## 4. Implementation Status & Roadmap

### Phase 1: Core Kernel (Current Status: ~90%)
*   [x] **Backend Structure**: FastAPI + SQLModel + PostgreSQL setup.
*   [x] **Authentication**: JWT, Login, Permission management.
*   [x] **Frontend Skeleton**: Tabler UI, SPA Router.
*   [x] **Machine Firewall**: `manager.py`, `iptables` wrapper, DB Models.
    *   *Pending*: Final verification of Rule Application ordering.
*   [x] **Module Manager**: Basic loader and Upload API.

### Phase 2: Refactoring & Stabilization (Immediate Priority)
*   [ ] **Frontend Modularization**: Split `app.js` and big scripts into `views/*.js`.
*   [ ] **Fix Regressions**: Ensure "Apply Rules" and "User Management" work perfectly in the new structure.

### Phase 3: WireGuard Module (The "Pilot")
*   [ ] **Migration**: Move `_legacy` WireGuard logic into `backend/staging/wireguard`.
*   [ ] **Refactor**: Update it to use `core.firewall` hooks instead of direct iptables calls.
*   [ ] **Frontend**: Build a detached `wireguard.js` view.

## 5. Critical Troubleshooting Notes
*   **"Internal Server Error 500"**: Usually DB constraints (check empty strings vs NULL).
*   **"Iptables Error"**: Check if `FW_*` chains exist (`firewall_mgr.initialize_chains()`).
*   **"Missing Menu"**: Check `backend/core/ui_router.py` and ensure User Permissions match.
