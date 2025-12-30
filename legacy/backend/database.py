from sqlmodel import SQLModel, create_engine, Session
import os

DATA_DIR = "/opt/vpn-manager/backend/data"
DB_NAME = "vpn.db"
DB_URL = f"sqlite:///{os.path.join(DATA_DIR, DB_NAME)}"

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# check_same_thread=False is needed for SQLite with FastAPI (multiple threads)
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
