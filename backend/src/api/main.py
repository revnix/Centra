# src/api/main.py

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from src.api.core.config import settings
from src.api.routes import (
    auth,
    jobs,
    integrations,
    candidates,
    applications,
    interviews,
    indeed,
)
from src.api.routes.admin import (
    users as admin_users,
    jobs as admin_jobs,
    integrations as admin_integrations,
)
from src.api.routes.admin.integrations import (
    linkedin as linkedin_integration,
    indeed as indeed_integration,
)

from src.api.db.session import engine
from src.api.db.base import Base
from contextlib import asynccontextmanager
import uvicorn


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

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "resumes"), exist_ok=True)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["auth"])
app.include_router(jobs.router, prefix=f"{settings.API_V1_PREFIX}/jobs", tags=["jobs"])
app.include_router(integrations.router, prefix=f"{settings.API_V1_PREFIX}/integrations", tags=["integrations"])
app.include_router(indeed.router, prefix=f"{settings.API_V1_PREFIX}/indeed", tags=["indeed"])

# Admin Routes
app.include_router(admin_users.router, prefix=f"{settings.API_V1_PREFIX}/admin/users", tags=["admin-users"])
app.include_router(admin_jobs.router, prefix=f"{settings.API_V1_PREFIX}/admin/jobs", tags=["admin-jobs"])
app.include_router(linkedin_integration.router, prefix=f"{settings.API_V1_PREFIX}/admin/integrations/linkedin", tags=["admin-integrations-linkedin"])
app.include_router(indeed_integration.router, prefix=f"{settings.API_V1_PREFIX}/admin/integrations/indeed", tags=["admin-integrations-indeed"])

# Hiring Workflow Routes
app.include_router(candidates.router, prefix=f"{settings.API_V1_PREFIX}/candidates", tags=["candidates"])
app.include_router(applications.router, prefix=f"{settings.API_V1_PREFIX}/applications", tags=["applications"])
app.include_router(interviews.router, prefix=f"{settings.API_V1_PREFIX}/interviews", tags=["interviews"])


@app.get("/")
def root():
    return {"message": "Welcome to Evalyn API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=2024, reload=True)