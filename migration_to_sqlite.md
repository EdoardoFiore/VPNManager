# Refactoring Plan: Migration to SQLite

This document outlines the strategy to migrate the data storage layer from flat JSON files to a relational **SQLite** database. This move will ensure **ACID compliance** (reliability against crashes), improved data integrity through foreign keys, and faster query performance.

We will use **SQLModel** (built on top of SQLAlchemy and Pydantic) to integrate seamlessly with the existing FastAPI structure.

---

## 1. Database Schema Design

We will transition from isolated JSON files to relational tables.

### Tables

#### 1. `instances`
*   **id**: `str` (Primary Key). The internal ID (e.g., `amministrazione`).
*   **name**: `str`. Display name.
*   **port**: `int` (Unique). UDP listening port.
*   **interface**: `str` (Unique). Interface name (e.g., `wg0`).
*   **subnet**: `str`. CIDR (e.g., `10.8.0.0/24`).
*   **private_key**: `str`. WireGuard Private Key.
*   **public_key**: `str`. WireGuard Public Key.
*   **tunnel_mode**: `str`. `full` or `split`.
*   **routes**: `JSON` (Column). Serialized list of custom routes.
*   **dns_servers**: `JSON` (Column). Serialized list of DNS.
*   **firewall_policy**: `str`. `ACCEPT` or `DROP`.
*   **status**: `str`. Runtime status (can remain in-memory or DB, DB is better for persistent intent).

#### 2. `clients`
*   **id**: `UUID` (Primary Key).
*   **instance_id**: `str` (Foreign Key -> `instances.id`).
*   **name**: `str`.
*   **private_key**: `str`.
*   **public_key**: `str`.
*   **preshared_key**: `str`.
*   **allocated_ip**: `str`. The static IP assigned.
*   **created_at**: `datetime`.

#### 3. `groups`
*   **id**: `str` (Primary Key).
*   **instance_id**: `str` (Foreign Key -> `instances.id`).
*   **name**: `str`.
*   **description**: `str`.

#### 4. `group_members` (Junction Table)
*   **group_id**: `str` (Foreign Key -> `groups.id`).
*   **client_id**: `UUID` (Foreign Key -> `clients.id`).
*   *Replaces the list of strings in `groups.json`.*

#### 5. `firewall_rules`
*   **id**: `UUID` (Primary Key).
*   **group_id**: `str` (Foreign Key -> `groups.id`).
*   **action**: `str`.
*   **protocol**: `str`.
*   **port**: `str` (Optional).
*   **destination**: `str`.
*   **sort_order**: `int`.

#### 6. `machine_firewall_rules`
*   **id**: `UUID` (Primary Key).
*   **chain**: `str`.
*   **action**: `str`.
*   ... (other fields from current JSON)
*   **sort_order**: `int`.

---

## 2. Implementation Steps

### Phase 1: Dependencies & Setup
1.  **Dependencies**: Add `sqlmodel` to `backend/requirements.txt`.
2.  **Database Config**: Create `backend/db.py` to handle the SQLite connection (`/opt/vpn-manager/backend/data/vpn.db`) and session creation.

### Phase 2: Define Models (`backend/models.py`)
Create the SQLModel classes. This replaces the Pydantic models currently scattered across `*_manager.py` files.
*   *Benefit:* SQLModel classes act as both SQL Tables AND Pydantic validation models, reducing code duplication.

### Phase 3: Migration Script (`scripts/migrate_json_to_sqlite.py`)
A one-off script to preserve existing data:
1.  Initialize the SQLite DB (create tables).
2.  Read `instances.json` -> Insert into `instances` table.
3.  Iterate through `clients/{instance}.json` and `allocations/{instance}.json` -> Insert into `clients` table.
4.  Read `groups.json` and `rules.json` -> Insert into `groups`, `group_members`, and `firewall_rules`.
5.  Read `machine_firewall_rules.json` -> Insert into `machine_firewall_rules`.

### Phase 4: Refactoring Managers (Core Logic)

#### `backend/instance_manager.py`
*   Remove JSON IO logic.
*   Inject `Session` dependency.
*   `create_instance`: `session.add(instance)`, `session.commit()`.
*   `get_instances`: `session.exec(select(Instance)).all()`.

#### `backend/ip_manager.py`
*   **Major Change**: Remove `allocations/` JSON usage.
*   `allocate_static_ip`:
    1.  Query `clients` table for all `allocated_ip` where `instance_id` matches.
    2.  Calculate available IPs in subnet (Python logic).
    3.  Return first free one.
*   The IP is now saved when the *Client* is saved, not in a separate file.

#### `backend/vpn_manager.py`
*   Refactor to use DB queries for `create_client` (INSERT), `revoke_client` (DELETE), `list_clients` (SELECT).
*   Join tables to get Client + Instance details in one query for config generation.

#### `backend/firewall_manager.py`
*   Refactor `load_groups`, `load_rules` to Query the DB.
*   Update `add_member` logic to insert into the junction table `group_members`.

### Phase 5: Verification & Cleanup
1.  Run the backend with the new DB logic.
2.  Verify the Dashboard works seamlessly (Frontend shouldn't notice the difference).
3.  Archive and delete the old JSON files.

---

## 3. Benefits of this Refactoring

1.  **Consistency**: No more "orphan" IPs (allocations without a client) or broken groups (members that don't exist). The Database constraints (Foreign Keys) prevent this.
2.  **Performance**: Fetching a client's details doesn't require parsing 5 different JSON files.
3.  **Concurrency**: Multiple admins (or API calls) can operate simultaneously without race conditions corrupting files.
4.  **Standardization**: Uses industry-standard tools (SQLAlchemy/SQLModel) making the codebase easier to maintain for any Python developer.
