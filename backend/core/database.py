from typing import Generator
from sqlmodel import create_engine, SQLModel, Session
import os

# Configuration
# TODO: Move to a proper Config class (pydantic-settings) later
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./backend/data/madmin.db")

# Initialize Engine
# check_same_thread=False is needed for SQLite with FastAPI
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

def get_session() -> Generator[Session, None, None]:
    """Dependency for FastAPI Routes"""
    with Session(engine) as session:
        yield session

def init_db():
    """
    Initializes the database.
    In production, use Alembic. For quick dev start, this creates tables.
    """
    SQLModel.metadata.create_all(engine)
