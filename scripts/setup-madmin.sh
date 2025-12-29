#!/bin/bash
set -e

# MADmin - Modular Admin Interface Setup Script
# Installs Python dependencies and sets up the Systemd service.

APP_DIR="/opt/vpn-manager"
BACKEND_DIR="$APP_DIR/backend"
VENV_DIR="$APP_DIR/venv"

# 1. System Dependencies
echo "[*] Installing System Dependencies..."
apt-get update
apt-get install -y python3 python3-pip python3-venv postgresql libpq-dev iptables curl git

# 2. Virtual Environment
echo "[*] Setting up Python Environment..."
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -r "$BACKEND_DIR/requirements.txt"

# 3. Directory Permissions
echo "[*] Setting Permissions..."
mkdir -p "$BACKEND_DIR/data"
mkdir -p "$BACKEND_DIR/modules"
mkdir -p "$BACKEND_DIR/staging"

# 4. Systemd Service
echo "[*] Configuring Systemd Service..."
SERVICE_FILE="/etc/systemd/system/madmin.service"

cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=MADmin Modular Admin Interface
After=network.target

[Service]
User=root
WorkingDirectory=$APP_DIR
Environment="PATH=$VENV_DIR/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONPATH=$APP_DIR"
ExecStart=$VENV_DIR/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable madmin
systemctl restart madmin

echo "=========================================="
echo "MADmin Setup Complete!"
echo "Service is running on port 8000"
echo "Check status: systemctl status madmin"
echo "=========================================="
