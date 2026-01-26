# src/api/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.core.config import settings
from src.api.routes import auth, jobs, integrations, candidates, applications, interviews
from src.api.routes.admin import users as admin_users, jobs as admin_jobs

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
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["auth"])
app.include_router(jobs.router, prefix=f"{settings.API_V1_PREFIX}/jobs", tags=["jobs"])
app.include_router(integrations.router, prefix=f"{settings.API_V1_PREFIX}/integrations", tags=["integrations"])

# Admin Routes
app.include_router(admin_users.router, prefix=f"{settings.API_V1_PREFIX}/admin/users", tags=["admin-users"])
app.include_router(admin_jobs.router, prefix=f"{settings.API_V1_PREFIX}/admin/jobs", tags=["admin-jobs"])

# Hiring Workflow Routes
app.include_router(candidates.router, prefix=f"{settings.API_V1_PREFIX}/candidates", tags=["candidates"])
app.include_router(applications.router, prefix=f"{settings.API_V1_PREFIX}/applications", tags=["applications"])
app.include_router(interviews.router, prefix=f"{settings.API_V1_PREFIX}/interviews", tags=["interviews"])


@app.get("/")
def root():
    return {"message": "Welcome to Evalyn API"}