# Refactoring Plan: Migration to WireGuard

This document outlines the comprehensive plan to replace the current OpenVPN-based architecture with **WireGuard**. The goal is to improve performance, simplify client configuration (QR Codes), and remove dependencies on external scripts (like `openvpn-install.sh` and `easy-rsa`), managing everything via native Python code.

---

## 1. Architecture Changes

### Core Differences
| Feature | Old Architecture (OpenVPN) | New Architecture (WireGuard) |
| :--- | :--- | :--- |
| **Protocol** | TCP/UDP (Connection-oriented) | **UDP Only** (Connectionless) |
| **Authentication** | PKI (CA, Certs, CRL) via `easy-rsa` | **Key Pairs** (Public/Private) + PSK |
| **Identity** | Common Name (CN) in Certificate | **Public Key** + Static IP |
| **Interfaces** | `tun0`, `tun1`, etc. | `wg0`, `wg1`, etc. |
| **Service** | `openvpn@server` | `wg-quick@wg0` (systemd) |
| **IP Management** | DHCP internal to OpenVPN (ipp.txt) | **Strict Static IP Allocation** (Managed by App) |

---

## 2. Implementation Steps

### Phase 1: Environment & Setup (`setup-vpn-manager.sh`)

**Objective:** Clean up OpenVPN dependencies and install WireGuard tools.

1.  **Remove:** `openvpn`, `easy-rsa`.
2.  **Install:** `wireguard`, `wireguard-tools`, `qrencode` (optional, for CLI debug), `iptables-persistent`.
3.  **Kernel Module:** WireGuard is built-in on Ubuntu 24.04 (Linux 5.6+). Ensure module is loaded (`modprobe wireguard`).
4.  **Configuration Directory:** Create `/etc/wireguard` with restrictive permissions (`700`).

### Phase 2: Backend Core - WireGuard Management (`backend/wireguard_manager.py`)

**Objective:** Create a dedicated Python module to handle WireGuard specific operations natively, replacing shell scripts.

**Key Functions to Implement:**
*   `generate_keypair() -> (private_key, public_key)`: Wraps `wg genkey` and `wg pubkey`.
*   `generate_psk() -> psk`: Wraps `wg genpsk`.
*   `create_interface_config(instance: Instance, private_key: str) -> str`: Generates the server-side `[Interface]` block.
*   `add_peer_to_config(interface: str, public_key: str, allowed_ips: str, psk: str)`: Appends a `[Peer]` block to the server config.
*   `remove_peer_from_config(interface: str, public_key: str)`: Removes a peer block.
*   `hot_reload_interface(interface: str)`: Uses `wg syncconf` to apply changes without restarting the tunnel.

### Phase 3: Instance Manager Refactoring (`backend/instance_manager.py`)

**Objective:** Adapt instance creation logic to WireGuard standards.

1.  **Create Instance:**
    *   Generate Server Keys using `wireguard_manager`.
    *   Save keys securely (e.g., in `data/instances.json` or separate secure file).
    *   Assign Port (UDP only).
    *   Create `/etc/wireguard/{instance_id}.conf`.
    *   Enable systemd service: `wg-quick@{instance_id}`.
2.  **Network Interface:** Change naming convention from `tunX` to `wgX`.
3.  **Persistence:** Store `server_private_key`, `server_public_key`, `listen_port` in the Instance model.

### Phase 4: Client & Peer Management (`backend/vpn_manager.py`)

**Objective:** Manage clients as WireGuard Peers with strict IP allocation and custom Routing Profiles.

1.  **Routing Logic (Split vs Full Tunnel):**
    *   Unlike OpenVPN's `push route`, WireGuard routing is defined client-side via `AllowedIPs`.
    *   **Backend Responsibility:** When generating the client config file, dynamically populate `AllowedIPs` based on the Instance or Group settings.
        *   **Full Tunnel:** `AllowedIPs = 0.0.0.0/0, ::/0`
        *   **Split Tunnel:** `AllowedIPs = 10.8.0.0/24, 192.168.1.0/24` (Internal VPN subnet + Specific Cloud Subnets).

2.  **Create Client:**
    *   Generate Client Keypair + PSK.
    *   **CRITICAL:** Allocate a static IP from the subnet using `ip_manager.py`. WireGuard *requires* knowing the peer's allowed internal IP in advance.
    *   Update Server Config: Add `[Peer]` block with `PublicKey={client_pub}`, `AllowedIPs={allocated_ip}/32`.
    *   Reload Server: `wg syncconf`.
    *   Save Client Data: Store Name, Public Key, Private Key (encrypted/protected or transiently), Allocated IP, PSK.

3.  **Get Client Config:**
    *   Generate INI format for the client app:
        ```ini
        [Interface]
        PrivateKey = {client_private_key}
        Address = {allocated_ip}/{subnet_cidr}
        DNS = {dns_servers}

        [Peer]
        PublicKey = {server_public_key}
        PresharedKey = {psk}
        Endpoint = {server_public_ip}:{port}
        # This line defines the Routing (Split vs Full)
        AllowedIPs = {computed_allowed_ips_string}
        PersistentKeepalive = 25
        ```

4.  **Revoke Client:**
    *   Remove `[Peer]` block from server config.
    *   Release IP in `ip_manager.py`.
    *   Reload Server.

### Phase 5: Firewall Adaptation (`backend/iptables_manager.py`)

**Objective:** Update firewall rules for WireGuard interfaces and enforce security boundaries.

1.  **Security Enforcement:**
    *   Since users can technically edit their local `AllowedIPs` config to try and access unauthorized networks, **Server-Side Firewalling is mandatory**.
    *   The existing hierarchical chain structure (`VPN_MAIN_FWD` -> `VI_wgX` -> `VIG_group`) is perfect for this.
    *   Even if a user sets "Full Tunnel" locally, `iptables` rules in `VIG_group` will drop traffic destined to unauthorized subnets.

2.  **Interface Matching:** Update all regex or strings matching `tun+` / `tun*` to match `wg+` / `wg*`.

3.  **Cleaner Integration (No "Default Chain" mess):**
    *   WireGuard's `wg-quick` tool allows disabling automatic iptables rule generation (`Table = off` in server config).
    *   **Benefit:** We won't need to "clean up" legacy rules or fight against default rules injected by the VPN service. We will have full, clean control over `VPN_*` chains from the start.

4.  **Input Chain:** Ensure `VPN_INPUT` accepts traffic on the new UDP ports (e.g., 51820, 51821). Remove TCP rule generation.

### Phase 6: Frontend Enhancements (QR Code)

**Objective:** Enable "Scan to Connect" UX.

1.  **New API Endpoint:** `GET /api/clients/{id}/config` (returns raw text config).
2.  **Frontend Lib:** Add `qrcode.js` (or similar lightweight lib) to `frontend/js/`.
3.  **UI Update:**
    *   Add "QR Code" button next to "Download Config".
    *   Modal popup rendering the QR code of the config text.
    *   Remove "Certificate Expiration" columns.

---

## 3. Migration Strategy (Clean Break)

Since we are early in development/refactoring, a **Clean Break** is recommended over maintaining a hybrid state.

1.  **Wipe:** Existing OpenVPN instances and configs will be incompatible. A reset script will clear `/etc/openvpn` and database.
2.  **Deploy:** Run the new `setup-vpn-manager.sh` to install WireGuard.
3.  **Re-create:** Admin creates new WireGuard instances via UI.

---

## 4. Dependencies

*   **OS:** Ubuntu 24.04 LTS (Kernel 5.6+).
*   **Packages:** `wireguard`, `wireguard-tools`, `iptables`.
*   **Python:** No external PyPI wrappers needed; direct `subprocess` calls to `wg` tools are safer and standard practice.

