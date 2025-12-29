from sqlmodel import SQLModel, create_engine, Session
import os

from dotenv import load_dotenv

# Load env vars
load_dotenv("/opt/vpn-manager/backend/.env")

DATA_DIR = "/opt/vpn-manager/backend/data"

# Default to SQLite if no DB_URL set (backward compatibility/dev)
sqlite_url = f"sqlite:///{os.path.join(DATA_DIR, 'vpn.db')}"
db_url = os.getenv("DATABASE_URL", sqlite_url)

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

connect_args = {}
if "sqlite" in db_url:
    connect_args["check_same_thread"] = False

engine = create_engine(db_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
