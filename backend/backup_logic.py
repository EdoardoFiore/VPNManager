import os
import shutil
import zipfile
import sqlite3
import datetime
import logging
import iptables_manager
import subprocess

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(BACKEND_DIR, 'data') # SQLite is in backend/data
CONFIG_DIR = "/etc/wireguard" # WireGuard configs
UPLOAD_DIR = "/opt/vpn-manager/frontend/static/uploads" # Uploads directory

def create_backup_zip():
    """
    Creates a zip archive containing:
    1. SQL dump of the database (safe check)
    2. WireGuard configuration files (/etc/wireguard)
    3. Uploaded files (logos, etc.)
    
    Returns:
        Path to the created zip file
    """
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"vpn_backup_{timestamp}.zip"
    backup_path = os.path.join(BACKEND_DIR, 'static', 'backups', backup_filename)
    # Ensure dir exists
    os.makedirs(os.path.dirname(backup_path), exist_ok=True)
    
    # DB Path
    db_path = os.path.join(DATA_DIR, 'vpn.db')
    
    try:
        logger.info(f"Starting backup creation: {backup_path}")
        with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 1. Add Database
            if os.path.exists(db_path):
                logger.info(f"Adding database from {db_path}")
                # Copy to temp file first to avoid locking issues (basic approach)
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

            # 3. Add Uploads (Logos)
            if os.path.exists(UPLOAD_DIR):
                for root, dirs, files in os.walk(UPLOAD_DIR):
                    for file in files:
                        file_path = os.path.join(root, file)
                        # Archive name: uploads/filename or uploads/subdir/filename
                        arcname = os.path.join("uploads", os.path.relpath(file_path, UPLOAD_DIR))
                        zipf.write(file_path, arcname=arcname)

        logger.info(f"Backup created at {backup_path}")
        return backup_path

    except Exception as e:
        logger.error(f"Backup failed: {e}")
        if os.path.exists(backup_path):
            os.remove(backup_path) # Cleanup failed partial
        raise e

def restore_backup(zip_path):
    """
    Restores the system from a zip backup.
    1. Extract DB to temp
    2. Extract Configs to temp
    3. Extract Uploads to temp
    4. Overwrite real locations
    5. Set permissions
    6. Restart WireGuard Services
    """
    logger.info(f"Starting restore from {zip_path}")
    
    # Temp extraction dir
    extract_dir = os.path.join(BACKEND_DIR, 'temp_restore')
    if os.path.exists(extract_dir):
        shutil.rmtree(extract_dir)
    os.makedirs(extract_dir)
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as zipf:
            zipf.extractall(extract_dir)
            
        # 1. Restore Database
        restored_db = os.path.join(extract_dir, 'database', 'vpn.db')
        target_db = os.path.join(DATA_DIR, 'vpn.db')
        
        if os.path.exists(restored_db):
            # Backup current DB just in case
            if os.path.exists(target_db):
                shutil.move(target_db, f"{target_db}.bak_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}")
            
            shutil.copy2(restored_db, target_db)
            logger.info("Database restored.")
            
            # Flush old VPN firewall chains to prevent zombies from previous state
            try:
                iptables_manager.flush_all_vpn_chains()
            except Exception as e:
                logger.warning(f"Failed to flush old firewall chains: {e}")
        
        # 2. Restore WireGuard Configs
        restored_configs = os.path.join(extract_dir, 'wireguard')
        if os.path.exists(restored_configs):
            for file in os.listdir(restored_configs):
                if file.endswith('.conf'):
                    src = os.path.join(restored_configs, file)
                    dst = os.path.join(CONFIG_DIR, file)
                    shutil.copy2(src, dst)
                    # Set permissions 600
                    os.chmod(dst, 0o600)
                    
                    # Restart Interface Logic
                    interface = file.replace('.conf', '')
                    restart_wireguard_interface(interface)

            logger.info("WireGuard configs restored and interfaces restarted.")
        
        # 2.5 Re-Apply Firewall Rules from valid DB state
        # Now that DB is restored and Chains are flushed, we re-apply everything to memory
        try:
            iptables_manager.apply_all_vpn_rules()
            logger.info("Firewall rules re-applied from restored database.")
            
            # 2.6 Persist rules to file
            save_script = os.path.join(ROOT_DIR, 'scripts', 'save-iptables.sh')
            if os.path.exists(save_script):
                # Ensure executable
                os.chmod(save_script, 0o755) 
                subprocess.run([save_script], check=True, capture_output=True)
                logger.info(f"Firewall rules persisted via {save_script}")
            else:
                logger.warning(f"Save script not found at {save_script}")
                
        except Exception as e:
            logger.error(f"Failed to re-apply/save firewall rules during restore: {e}")


        # 3. Restore Uploads
        restored_uploads = os.path.join(extract_dir, 'uploads')
        if os.path.exists(restored_uploads):
            if not os.path.exists(UPLOAD_DIR):
                os.makedirs(UPLOAD_DIR, exist_ok=True)
            # Copy all files recursively
            for root, dirs, files in os.walk(restored_uploads):
                for file in files:
                    src = os.path.join(root, file)
                    rel = os.path.relpath(src, restored_uploads)
                    dst = os.path.join(UPLOAD_DIR, rel)
                    os.makedirs(os.path.dirname(dst), exist_ok=True)
                    shutil.copy2(src, dst)
            logger.info("Uploads restored.")
            
            logger.info("Uploads restored.")
            
        # 4. Restart VPN Manager Service (Delayed)
        # We need to restart the backend service to ensure it loads the new DB/State cleanly.
        # We use a delay to allow the API to return the success response to the client first.
        try:
            logger.info("Scheduling delayed restart of vpn-manager service...")
            subprocess.Popen(["bash", "-c", "sleep 3; systemctl restart vpn-manager"], 
                             start_new_session=True, 
                             stdout=subprocess.DEVNULL, 
                             stderr=subprocess.DEVNULL)
        except Exception as e:
            logger.error(f"Failed to schedule service restart: {e}")
            
        return True

    except Exception as e:
        logger.error(f"Restore failed: {e}")
        raise e
    finally:
        # Cleanup temp
        if os.path.exists(extract_dir):
            shutil.rmtree(extract_dir)

def restart_wireguard_interface(interface):
    """
    Attempts to restart or bring up a WireGuard interface using systemd.
    This ensures the service status remains consistent.
    """
    logger.info(f"Restarting interface {interface} via systemd")
    
    try:
        # 1. Enable service for persistence
        subprocess.run(['systemctl', 'enable', f'wg-quick@{interface}'], check=True)
        
        # 2. Restart service (handles stop/start and status update)
        # We use restart to cover both "not running" (start) and "running" (restart) cases
        subprocess.run(['systemctl', 'restart', f'wg-quick@{interface}'], check=True)
        
    except Exception as e:
        logger.error(f"Failed to restart systemd service for {interface}: {e}")
        # Fallback: try manual cleanup if systemd failed due to "already exists" conflict
        try:
             subprocess.run(['wg-quick', 'down', interface], stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
             subprocess.run(['systemctl', 'restart', f'wg-quick@{interface}'], check=True)
        except Exception as e2:
             logger.error(f"Fallback restart failed for {interface}: {e2}")
