
import sqlite3
import os

# Adjust path to backend/data/vpn.db
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', 'data', 'vpn.db')

def check_favicon():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check columns
        cursor.execute("PRAGMA table_info(systemsettings)")
        columns = [info[1] for info in cursor.fetchall()]
        
        print(f"Columns in systemsettings: {columns}")
        
        if 'favicon_url' in columns:
            print("favicon_url column EXISTS.")
            # Check value
            cursor.execute("SELECT id, logo_url, favicon_url FROM systemsettings WHERE id=1")
            row = cursor.fetchone()
            if row:
                print(f"Row 1: ID={row[0]}, logo_url='{row[1]}', favicon_url='{row[2]}'")
            else:
                print("No row found with ID 1.")
        else:
            print("favicon_url column MISSING.")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_favicon()
