import os
import shutil
import zipfile
import sqlite3
import datetime
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(BACKEND_DIR, 'data') # SQLite is in backend/data
CONFIG_DIR = "/etc/wireguard" # WireGuard configs

def create_backup_zip():
    """
    Creates a zip archive containing:
    1. SQL dump of the database (safe check)
    2. WireGuard configuration files (/etc/wireguard)
    
    Returns:
        Path to the created zip file
    """
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"vpn_backup_{timestamp}.zip"
    backup_path = os.path.join(BACKEND_DIR, 'static', 'backups', backup_filename) # Store in static/backups?
    # Ensure dir exists
    os.makedirs(os.path.dirname(backup_path), exist_ok=True)
    
    # DB Path
    db_path = os.path.join(DATA_DIR, 'vpn.db') # Verify this location in database.py
    
    try:
        logger.info(f"Starting backup creation: {backup_path}")
        with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 1. Add Database
            if os.path.exists(db_path):
                logger.info(f"Adding database from {db_path}")
                # We can't zip the live DB safely if it's locked.
                # Better to perform a hot backup or dump.
                # SQLite 'vacuum into' or similar. 
                # For simplicity, let's copy it to a temp file first.
                temp_db_path = f"{db_path}.temp"
                shutil.copy2(db_path, temp_db_path)
                zipf.write(temp_db_path, arcname="database/vpn.db")
                os.remove(temp_db_path)
            else:
                logger.warning(f"Database not found at {db_path}")

            # 2. Add WireGuard Configs
            if os.path.exists(CONFIG_DIR):
                for root, dirs, files in os.walk(CONFIG_DIR):
                    for file in files:
                        if file.endswith('.conf'):
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, os.path.dirname(CONFIG_DIR)) # e.g. wireguard/wg0.conf
                            zipf.write(file_path, arcname=arcname)
            else:
                logger.warning(f"Config dir not found at {CONFIG_DIR}")

        logger.info(f"Backup created at {backup_path}")
        return backup_path

    except Exception as e:
        logger.error(f"Backup creation failed: {e}")
        # Clean up partial file
        if os.path.exists(backup_path):
            os.remove(backup_path)
        raise e
