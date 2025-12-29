from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import Session, select

from backend.core.database import init_db, engine, get_session
from backend.core.auth.router import router as auth_router
from backend.core.firewall.router import router as firewall_router
from backend.core.module_manager.router import router as modules_router
from backend.core.module_manager.loader import loader
# Import models
import backend.core.firewall.models 
import backend.core.module_manager.models

from backend.core.auth.models import User
from backend.core.auth.utils import get_password_hash

def seed_admin():
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == "admin")).first()
        if not user:
            print("Seeding 'admin' user...")
            admin_user = User(
                username="admin", 
                hashed_password=get_password_hash("admin"), # Change in prod!
                is_superuser=True
            )
            session.add(admin_user)
            session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    seed_admin()
    
    # Load Modules
    loader.discover_and_load(app)
    
    print("MADmin Kernel Started.")
    yield
    # Shutdown
    print("MADmin Kernel Stopping...")

app = FastAPI(
    title="MADmin Kernel",
    description="Modular Admin Interface - Core API",
    version="0.1.0",
    lifespan=lifespan
)

# CORS (Allow all for development, restrict in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/core/auth", tags=["Core Auth"])
app.include_router(firewall_router, prefix="/api/core/firewall", tags=["Core Firewall"])
app.include_router(modules_router, prefix="/api/core/modules", tags=["Core Modules"])

@app.get("/")
def read_root():
    return {"status": "online", "system": "MADmin Kernel"}
