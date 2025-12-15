# Automated WireGuard Manager with Web Interface

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Lang: IT](https://img.shields.io/badge/Lang-IT-red.svg)](README_IT.md)

A complete system to automate the deployment and management of WireGuard servers on Ubuntu 24.
This project modernizes VPN management using **WireGuard** (faster, leaner, and more secure than OpenVPN) and offers a modern web dashboard for daily management, built with recent technologies like Python FastAPI, SQLModel, and Tabler.

Whether you are an expert sysadmin or an enthusiast looking to protect your browsing, this system allows you to be operational in minutes with a next-generation VPN.

---

## 🚀 Quick Installation

The installation is designed to be "Zero Config": clone the repository, run the script, and the system handles the rest.

### Prerequisites

*   **OS**: A machine (physical or virtual) with **Ubuntu 24.04 LTS** (recommended) or Debian 12.
*   **Privileges**: Root access (`sudo`).
*   **Network**:
    *   **Public IP**: Ideal.
    *   **NAT**: If you are behind a router, you must forward the UDP port used by the instance (default `51820` for the first instance) and TCP `80` (for the dashboard).

### Steps

1.  **Download the Project**
    Access your server and clone the repository:
    ```bash
    git clone https://github.com/EdoardoFiore/VPNManager.git
    cd VPNManager/scripts
    ```

2.  **Start Installation**
    Run the setup script. It will guide you through installing dependencies (WireGuard, Python, Nginx).
    ```bash
    sudo bash setup-vpn-manager.sh
    ```

3.  **Finished!**
    Upon completion, the script will provide the URL to access the dashboard (e.g., `http://YOUR_PUBLIC_IP`) and the generated API key.

---

## ✨ Key Features

*   **WireGuard Core**: Uses the high-performance WireGuard protocol, integrated into the Linux kernel.
*   **Multi-Instance Management**: Create multiple instances on different ports (e.g., `wg0` on 51820, `wg1` on 51821) to separate networks and purposes.
*   **Intuitive Dashboard**: Responsive web panel based on _Tabler_ to view status, QR codes, and configurations.
*   **Smart Tunnel Mode**:
    *   **Full Tunnel**: Route all Internet traffic through the VPN.
    *   **Split Tunnel**: Specify subnets to route (e.g., corporate networks), leaving the rest of the traffic direct.
    *   **Auto-Secure**: In Split Tunnel mode, the firewall automatically sets a `DROP` default policy for maximum security.
*   **Client Management**:
    *   Instant key generation (Public/Private/Preshared).
    *   QR Code display for mobile devices.
    *   `.conf` configuration download.
*   **Advanced Firewall (Iptables Wrapper)**:
    *   **Machine Firewall**: Manage global input/output rules for the server machine (e.g., allow SSH only from certain IPs).
    *   **Group Firewall**: Create logical groups (e.g., "Admin", "Guest") and assign specific access rules.
    *   The backend automatically manages `iptables` chains to ensure isolation and security (e.g., `VPN_INPUT`, `VIG_<GroupID>`).
*   **SQLite Database**: All configurations are saved in a `database.db` managed via SQLModel, replacing old JSON files for greater robustness.

---

## 🛠 How It Works (Backend & Architecture)

For those who want to understand what happens "under the hood":

### Tech Stack
*   **VPN Node**: WireGuard (Kernel Module).
*   **Backend**: Python 3.12+ with **FastAPI** and **SQLModel** (ORM for SQLite).
*   **Frontend**: PHP (Logic Layer) + HTML5/JS (Tabler UI) + AJAX for API communication.
*   **Web Server**: Nginx (Reverse Proxy & Auth).

### File Structure

| Directory | Content |
| :--- | :--- |
| `/opt/vpn-manager/backend` | API Server (Python). Contains `main.py`, models, and managers (WireGuard, Firewall). |
| `/opt/vpn-manager/backend/data` | SQLite Database (`database.db`) and generated WireGuard configurations. |
| `/opt/vpn-manager/frontend` | Public Web Interface. |
| `/etc/wireguard` | System directory where active configurations are linked. |

### Processes and Services

1.  **Backend API** (`vpn-manager.service`): Systemd service running Uvicorn/FastAPI. Handles logic, system calls (`wg`, `iptables`, `ip`), and the database.
2.  **Web Server** (`nginx`): Serves the static/PHP dashboard.
3.  **WireGuard** (`wg-quick@<name>`): Native WireGuard service for each active interface.

---

## 👥 User Management (RBAC)

The system includes a built-in user manager with roles:

*   **Admin**: Full access.
*   **Admin Read Only**: Full view but no modifications.
*   **Partner**: Full access (similar to Admin).
*   **Technician**: Manages only assigned instances (Start/Stop, Client, Policy).
*   **Viewer**: Read-only on assigned instances.

Access is managed via JWT and no longer requires Nginx Basic Auth.
By default, the `admin` user is created (password is set during the first script run).

---

## 🆘 Troubleshooting

*   **Dashboard Unreachable**: Check Nginx (`systemctl status nginx`).
*   **Error 500 / API Error**: Check backend logs:
    ```bash
    journalctl -u vpn-manager -f
    ```
*   **Client Connected but No Traffic**:
    *   Verify IP Forwarding (`sysctl net.ipv4.ip_forward`).
    *   Check Masquerading in firewall rules (`iptables -t nat -L -v`).
    *   If in Split Tunnel, check that you don't have `DROP` policies blocking everything without allow rules.

---

**License**: MIT. Enjoy!
