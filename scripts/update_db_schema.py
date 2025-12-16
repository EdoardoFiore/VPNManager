
import sqlite3
import os

DB_PATH = '/opt/vpn-manager/backend/data/vpn.db'

def migrate_db():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check SystemSettings table
        cursor.execute("PRAGMA table_info(systemsettings)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'favicon_url' not in columns:
            print("Adding favicon_url to systemsettings...")
            cursor.execute("ALTER TABLE systemsettings ADD COLUMN favicon_url TEXT")
            print("Done.")
        else:
            print("favicon_url already exists.")
            
    except Exception as e:
        print(f"Error migrating DB: {e}")
    finally:
        conn.commit()
        conn.close()

if __name__ == "__main__":
    migrate_db()
