from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.core.config import settings
from src.api.routes import auth, jobs, integrations
from src.api.routes.admin import users as admin_users, jobs as admin_jobs

# Lifecycle method for database initialization can be added here
# For now, we assume external migration or manual sync. 
# But let's add a startup event to create tables for this MVP context.
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
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS
origins = ["*"] # Adjust for production

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(jobs.router, prefix=f"{settings.API_V1_STR}/jobs", tags=["jobs"])
app.include_router(integrations.router, prefix=f"{settings.API_V1_STR}/integrations", tags=["integrations"])
# Admin Routes
app.include_router(admin_users.router, prefix=f"{settings.API_V1_STR}/admin/users", tags=["admin-users"])
app.include_router(admin_jobs.router, prefix=f"{settings.API_V1_STR}/admin/jobs", tags=["admin-jobs"])

@app.get("/")
def root():
    return {"message": "Welcome to the FastAPI Backend"}
#e
