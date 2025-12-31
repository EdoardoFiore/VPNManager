# MADMIN Project - Development Tasks

## Phase 1: Core Kernel Development ✅
- [x] Backend project structure with FastAPI
- [x] PostgreSQL database schema
- [x] Core authentication with granular permissions
- [x] Core firewall orchestrator
- [x] Module manager (loader, manifest, lifecycle)
- [x] Core settings management (SMTP, backup, customization)

## Phase 2: Frontend Core Development ✅
- [x] SPA structure with ES Modules
- [x] Core views (login, dashboard, users, firewall, settings)
- [x] Modular UI component system
- [x] Dynamic menu system for modules

## Phase 3: Installation & Deployment ✅
- [x] Unified setup-madmin.sh installer
- [x] Nginx configuration
- [x] Systemd services

## Phase 3.5: Core Settings Finalization ✅
- [x] File upload system (logo/favicon)
- [x] Support URL in footer
- [x] SMTP test email
- [x] Backup system (db dump, SFTP/FTP)

## Phase 4: Module System Enhancements (Current)
- [x] Enhanced manifest specification
  - [x] `system_dependencies` (apt, pip)
  - [x] `database_migrations`
  - [x] `install_hooks` (pre/post)
  - [x] `frontend_entry`
- [x] System dependency installer (apt/pip)
- [x] Database migration runner
- [x] Install hooks execution
- [x] Frontend view loader in SPA

## Phase 5: WireGuard Module ✅
- [x] Module directory structure
- [x] manifest.json with all features
- [x] Port models from legacy
- [x] Port service (wireguard_manager + instance_manager)
- [x] Instance CRUD API
- [x] Client management API
- [ ] Groups and rules API (future enhancement)
- [ ] Email sharing with magic tokens (future enhancement)
- [x] Frontend views (list, detail, clients)
- [x] QR code and config download

## Phase 6: Module Import System ✅
- [x] ZIP file upload endpoint
- [x] Staging folder scan
- [x] Install from staging API
- [x] Frontend modules management view
- [ ] (Future) GitHub repo import
