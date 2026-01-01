# MADMIN Roadmap

## Current Focus

See [Implementation Plan](implementation_plan.md) for active development items.

---

## Future Modules

### Phase 1 - Core Extensions (Near-term)

| Module | Description | Status |
|--------|-------------|--------|
| System Stats | CPU, RAM, Disk monitoring in dashboard | 📋 Planned |
| Crontab UI | Visual cron job management | 📋 Planned |
| Service Manager | Systemd service control | 📋 Planned |

### Phase 2 - Network Services (Mid-term)

| Module | Description | Status |
|--------|-------------|--------|
| **OpenVPN** | Legacy VPN with PKI management | 📋 Planned |
| **DNS Server** | Bind9/dnsmasq with native MADMIN UI | 📋 Planned |
| **Reverse Proxy** | Nginx/Caddy with Let's Encrypt | 📋 Planned |
| **Web Server** | Static hosting with virtual hosts | 📋 Planned |

### Phase 3 - Advanced (Long-term)

| Module | Description | Status |
|--------|-------------|--------|
| Docker Manager | Container orchestration | 💭 Idea |
| Monitoring | Metrics + alerting (Prometheus-style) | 💭 Idea |
| Backup Manager | Scheduled backups to S3/SFTP | 💭 Idea |
| Fail2Ban | Ban management UI | 💭 Idea |
| SSH Keys | Authorized keys management | 💭 Idea |

---

## Design Principles

1. **Native UI** - All modules use MADMIN's native Tabler-based UI
2. **No Third-Party Embeds** - Don't embed other project dashboards (e.g., Pi-hole, Webmin)
3. **Modular** - Each feature as a separate, installable module
4. **API-First** - All functionality exposed via REST API
5. **Reusable Core** - Core utilities available to all modules

---

## Legend

| Icon | Meaning |
|------|---------|
| ✅ | Completed |
| 🚧 | In Progress |
| 📋 | Planned |
| 💭 | Idea |
