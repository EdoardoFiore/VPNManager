# Modular Refactoring Master Plan

**Objective**: Transform the monolithic VPN Manager into a scalable, modular platform ("Core + Modules") backend by PostgreSQL.

## 1. Architectural Vision

### 1.1 The "Core"
The Core is the immutable foundation. It must NOT contain business logic for specific services (like VPNs or Hosting).
**Responsibilities**:
-   **Authentication & RBAC**: Managing Users, Roles, JWT.
-   **Module Loader**: Scanning, validating, and loading enabled modules.
-   **Menu System**: generating the side navigation dynamically based on installed modules.
-   **System Settings**: Hostname, Network Interfaces (read-only), Updates.
-   **Firewall Engine**: The base `iptables` wrapper that modules use to register rules.

### 1.2 The "Modules"
Modules are self-contained folders containing everything they need.
**Structure (`/opt/vpn-manager/backend/modules/MODULE_ID/`):**
-   `manifest.json`: Metadata (Name, Version, Icon, Menus).
-   `router.py`: FastAPI Router (endpoints).
-   `service.py`: Business logic.
-   `models.py`: SQLModel/SQLAlchemy tables (managed by the module).
-   `tasks.py`: Background jobs (optional).

### 1.3 Database: PostgreSQL
Switching from SQLite to PostgreSQL is critical for:
-   **Concurrency**: Multiple modules/users writing simultaneously.
-   **Types**: Better support for JSONB, Arrays (useful for flexible module configs).
-   **Future-proofing**: Essential if we add Web Hosting (client logical isolation).

---

## 2. Detailed Implementation Steps

### Phase 0: Infrastructure & PostgreSQL Migration

1.  **System Setup Update (`scripts/setup-vpn-manager.sh`)**:
    -   Add `apt-get install -y postgresql postgresql-contrib libpq-dev`.
    -   Setup default DB `vpnmanager` and user `vpnadmin`.
    -   Configure `pg_hba.conf` or user password.

2.  **Backend Dependency Update**:
    -   Add `psycopg2-binary` to `backend/requirements.txt`.
    -   Update `backend/database.py`:
        ```python
        # Old: sqlite:///./data/database.db
        # New: postgresql://vpnadmin:PASSWORD@localhost/vpnmanager
        ```

3.  **Data Migration Strategy**:
    -   Since the schema changes (modularization), a direct "dump and restore" might result in dirty tables.
    -   **Strategy**: Create fresh tables in Postgres. Write a temporary script `migrate_sqlite_to_pg.py` that reads the old `database.db` and inserts Users and Instances into the new schema positions.

### Phase 1: Core System & Frontend Layout

1.  **Vertical Sidebar Layout (`frontend/`)**:
    -   Refactor `header.php` to remove the top navbar.
    -   Implement a strict `2-column` grid: `Sidebar (250px)` | `Content (Auto)`.
    -   **Dynamic Menu Logic**:
        -   Frontend JS calls `GET /api/core/menu`.
        -   Backend aggregates generic Core items + items from `module.manifest`.
        -   Frontend renders the list.

2.  **Plugin Engine (`backend/main.py`)**:
    -   Create `backend/modules/__init__.py`.
    -   In `main.py`, loop through subdirectories in `backend/modules/`.
    -   Load `manifest.json`.
    -   Import `router.py` and call `app.include_router(module.router, prefix=f"/api/modules/{id}")`.

### Phase 2: WireGuard Module (The First Migration)

1.  **Extraction**:
    -   Move `backend/instance_manager.py` -> `backend/modules/wireguard/service.py`.
    -   Move `backend/models.py` (Instance parts) -> `backend/modules/wireguard/models.py`.
    -   Move specific API endpoints from `main.py` -> `backend/modules/wireguard/router.py`.

2.  **Manifest Definition**:
    ```json
    {
      "id": "wireguard",
      "name": "WireGuard VPN",
      "category": "VPN",
      "menu": [
        { "label": "Instances", "link": "/modules/wireguard/instances.php", "icon": "activity" },
        { "label": "Clients", "link": "/modules/wireguard/clients.php", "icon": "users" }
      ]
    }
    ```

### Phase 3: OpenVPN Module (New Feature)

1.  **Logic Implementation**:
    -   New Folder: `backend/modules/openvpn/`.
    -   Logic to manage `openvpn-server@NAME.service`.
    -   PKI Management (EasyRSA or python-pure implementation) for Certificates.

2.  **Frontend**:
    -   `frontend/modules/openvpn/create.php`.
    -   Params: Protocol (UDP/TCP), Port, Encryption Cipher.

---

## 3. Module Store & Distribution (Future Proofing)

-   **Short Term**: Hardcoded list of "Official Modules" (WireGuard, OpenVPN) in the Core.
-   **Mid Term**: `GET /api/store/available` fetches a JSON from a GitHub "Master Repo".
    -   User clicks "Install".
    -   Backend does `git clone https://github.com/YourOrg/mod_openvpn.git modules/openvpn`.
    -   Triggers `pip install -r modules/openvpn/requirements.txt`.
    -   Restarts Service.

## 4. Verification Checklist

- [ ] PostgreSQL is running and accessible by the Backend.
- [ ] Core starts up without any VPN logic (clean slate).
- [ ] WireGuard module loads and registers its routes.
- [ ] Frontend Sidebar renders "WireGuard" menu item.
- [ ] Existing WireGuard instances work after migration.
