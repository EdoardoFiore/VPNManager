#!/opt/vpn-manager-env/bin/python3
import sys
import os
import getpass

# Add current directory to path so we can import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from models import User
from auth import get_password_hash
from sqlmodel import Session, select

def reset_password(username, new_password):
    with Session(engine) as session:
        user = session.get(User, username)
        if not user:
            print(f"Error: User '{username}' not found.")
            return False
        
        user.hashed_password = get_password_hash(new_password)
        session.add(user)
        session.commit()
        print(f"Success: Password for '{username}' updated.")
        return True

if __name__ == "__main__":
    if len(sys.argv) > 2:
        username = sys.argv[1]
        password = sys.argv[2]
    elif len(sys.argv) == 2:
        username = sys.argv[1]
        password = getpass.getpass(f"Enter new password for {username}: ")
    else:
        print("Usage: python3 reset_password.py <username> [password]")
        username = "admin"
        print(f"Defaulting to user '{username}'")
        password = getpass.getpass(f"Enter new password for {username}: ")

    reset_password(username, password)
