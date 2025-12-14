import paramiko
import os
import ftplib
import logging

logger = logging.getLogger(__name__)

def upload_backup_sftp(local_path, host, user, password, port=22, remote_dir="/"):
    """Uploads file via SFTP"""
    try:
        transport = paramiko.Transport((host, port))
        transport.connect(username=user, password=password)
        sftp = paramiko.SFTPClient.from_transport(transport)
        
        filename = os.path.basename(local_path)
        remote_path = os.path.join(remote_dir, filename).replace("\\", "/") # Ensure Posix style? sftp usually is.
        
        sftp.put(local_path, remote_path)
        sftp.close()
        transport.close()
        logger.info(f"Uploaded {filename} to SFTP {host}:{remote_path}")
        return True
    except Exception as e:
        logger.error(f"SFTP Upload failed: {e}")
        return False

def upload_backup_ftp(local_path, host, user, password, port=21, remote_dir="/"):
    """Uploads file via FTP"""
    try:
        ftp = ftplib.FTP()
        ftp.connect(host, port)
        ftp.login(user, password)
        
        if remote_dir and remote_dir != "/":
            try:
                ftp.cwd(remote_dir)
            except ftplib.error_perm:
                 logger.error(f"Remote folder {remote_dir} does not exist on FTP.")
                 # Optional: create it?
                 return False

        filename = os.path.basename(local_path)
        with open(local_path, 'rb') as f:
            ftp.storbinary(f'STOR {filename}', f)
        
        ftp.quit()
        logger.info(f"Uploaded {filename} to FTP {host}")
        return True
    except Exception as e:
         logger.error(f"FTP Upload failed: {e}")
         return False

def upload_backup(local_path, settings):
    """Dispatcher for upload"""
    if settings.remote_protocol == 'sftp':
        return upload_backup_sftp(local_path, settings.remote_host, settings.remote_user, settings.remote_password, settings.remote_port, settings.remote_path)
    elif settings.remote_protocol == 'ftp':
        return upload_backup_ftp(local_path, settings.remote_host, settings.remote_user, settings.remote_password, settings.remote_port, settings.remote_path)
    else:
        logger.error(f"Unknown protocol: {settings.remote_protocol}")
        return False
