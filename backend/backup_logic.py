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

def restore_backup(zip_file_path: str):
    """
    Restores database and configurations from a zip file.
    Args:
        zip_file_path: Path to the uploaded zip file.
    RETURNS:
        bool: True if successful
    """
    logger.info(f"Starting restore from {zip_file_path}")
    
    # Paths
    db_path = os.path.join(DATA_DIR, 'vpn.db')
    
    # Temporary extraction dir
    temp_extract_dir = os.path.join(BACKEND_DIR, 'temp_restore')
    if os.path.exists(temp_extract_dir):
        shutil.rmtree(temp_extract_dir)
    os.makedirs(temp_extract_dir)
    
    try:
        with zipfile.ZipFile(zip_file_path, 'r') as zipf:
            zipf.extractall(temp_extract_dir)
            
        # 1. Restore Database
        extracted_db = os.path.join(temp_extract_dir, 'database', 'vpn.db')
        if os.path.exists(extracted_db):
            logger.info("Restoring database...")
            # Backup current DB just in case?
            if os.path.exists(db_path):
                 shutil.copy2(db_path, f"{db_path}.bak")
            
            # Allow overwrite
            shutil.copy2(extracted_db, db_path)
        else:
            logger.warning("No database found in backup zip.")

        # 2. Restore WireGuard Configs
        extracted_wg_dir = os.path.join(temp_extract_dir, 'wireguard')
        if os.path.exists(extracted_wg_dir):
            logger.info("Restoring WireGuard configs...")
            
            # Copy files
            for root, dirs, files in os.walk(extracted_wg_dir):
                for file in files:
                    src_file = os.path.join(root, file)
                    # Rel path from extracted_wg_dir
                    rel_path = os.path.relpath(src_file, extracted_wg_dir)
                    dest_file = os.path.join(CONFIG_DIR, rel_path)
                    
                    os.makedirs(os.path.dirname(dest_file), exist_ok=True)
                    shutil.copy2(src_file, dest_file)
                    # Fix permissions
                    os.chmod(dest_file, 0o600) # WG configs should be private
        else:
             logger.warning("No WireGuard configs found in backup zip.")

        logger.info("Restore completed successfully.")
        return True

    except Exception as e:
        logger.error(f"Restore failed: {e}")
        raise e
    finally:
        # Cleanup
        if os.path.exists(temp_extract_dir):
            shutil.rmtree(temp_extract_dir)
