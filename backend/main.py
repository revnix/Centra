# src/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.core.config import settings
from src.api.routes import auth, users

from src.flow.router.Admin import Integrations_routes as integration_routes

from src.api.db.session import engine
from src.api.db.base import Base
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables (simplistic approach for MVP without Alembic)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown

app = FastAPI(
    title=settings.APP_NAME,  # Also updated this to use APP_NAME
    lifespan=lifespan
)

# CORS
origins = ["*"]  # Adjust for production

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes - FIXED: Changed API_V1_STR to API_V1_PREFIX
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_PREFIX}/users", tags=["users"])

# Integration routes (from flow/router/admin)
app.include_router(
    integration_routes.router, 
    prefix=f"{settings.API_V1_PREFIX}/integrations", 
    tags=["integrations"]
)

@app.get("/")
def root():
    return {"message": "Welcome to Evalyn API"}