#!/bin/bash
set -e

# MADmin - Modular Admin Interface Setup Script
# Installs Python dependencies and sets up the Systemd service.

APP_DIR="/opt/madmin"
BACKEND_DIR="$APP_DIR/backend"
VENV_DIR="$APP_DIR/venv"

# Detect directory of this script (assuming it's in scripts/)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "[*] Detected Repo Root at: $REPO_ROOT"
echo "[*] Installing to: $APP_DIR"

# 0. Copy Files to Install Dir
# We use cp -r to copy the repo content to /opt/madmin
# ensuring we have the latest files there.
if [ "$REPO_ROOT" != "$APP_DIR" ]; then
    echo "[*] Copying files to $APP_DIR..."
    mkdir -p "$APP_DIR"
    # Copy backend, frontend (if exists), generic files
    # Avoiding copying venv or .git to keep it clean if possible, but simple cp -R is safer for now
    cp -R "$REPO_ROOT/backend" "$APP_DIR/"
    cp -R "$REPO_ROOT/scripts" "$APP_DIR/" 2>/dev/null || true
    # If frontend exists in future
    if [ -d "$REPO_ROOT/frontend" ]; then
        cp -R "$REPO_ROOT/frontend" "$APP_DIR/"
    fi
fi

# 1. System Dependencies
echo "[*] Installing System Dependencies..."
apt-get update
# Ensure basic tools
apt-get install -y python3 python3-pip python3-venv postgresql libpq-dev iptables curl git build-essential libffi-dev

# 2. Virtual Environment
echo "[*] Setting up Python Environment..."
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
pip install --upgrade pip

# CRITICAL: Uninstall bcrypt to avoid passlib conflict (ModuleNotFoundError: No module named 'bcrypt.__about__')
# pip uninstall -y bcrypt # Removed as requested to be non-destructive, but keep in mind if issues persist

pip install -r "$BACKEND_DIR/requirements.txt"

# 3. Database Setup (PostgreSQL)
echo "[*] Configuring PostgreSQL..."
# Create User and DB if they don't exist
# We use sudo -u postgres to run psql commands
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='madmin'" | grep -q 1; then
    echo "Creating 'madmin' database user..."
    sudo -u postgres psql -c "CREATE USER madmin WITH PASSWORD 'madmin';"
else
    echo "User 'madmin' already exists."
fi

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='madmin'" | grep -q 1; then
    echo "Creating 'madmin' database..."
    sudo -u postgres psql -c "CREATE DATABASE madmin OWNER madmin;"
else
    echo "Database 'madmin' already exists."
fi

# 4. Directory Permissions
echo "[*] Setting Permissions..."
mkdir -p "$BACKEND_DIR/data"
mkdir -p "$BACKEND_DIR/modules"
mkdir -p "$BACKEND_DIR/staging"

# 5. Systemd Service
echo "[*] Configuring Systemd Service..."
SERVICE_FILE="/etc/systemd/system/madmin.service"

cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=MADmin Modular Admin Interface
After=network.target postgresql.service

[Service]
User=root
WorkingDirectory=$APP_DIR
Environment="PATH=$VENV_DIR/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONPATH=$APP_DIR"
Environment="DATABASE_URL=postgresql://madmin:madmin@localhost/madmin"
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
