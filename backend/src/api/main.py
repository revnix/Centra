import asyncio
import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.api.core.config import settings
from src.api.db.session import engine, get_db
from src.api.routes import (
    applications,
    auth,
    candidates,
    integrations,
    interviews,
    jobs,
    langgraph,
    onboarding,
    uploads,
)
from src.api.routes.admin import (
    users as admin_users,
    jobs as admin_jobs,
)
from src.api.routes.admin.integrations import (
    linkedin as linkedin_integration,
    indeed as indeed_integration,
)

logger = logging.getLogger(__name__)


async def _migrate_enum_values():
    """Add new ApplicationStatus values to the PostgreSQL enum type if they don't exist."""
    new_values = [
        "INTERVIEW_SCHEDULED",
        "REFERENCE_CHECK",
        "OFFER_EXTENDED",
        "OFFER_ACCEPTED",
    ]
    try:
        async with engine.connect() as conn:
            await conn.execution_options(isolation_level="AUTOCOMMIT")
            for val in new_values:
                await conn.execute(
                    text(f"ALTER TYPE applicationstatus ADD VALUE IF NOT EXISTS '{val}'")
                )
        logger.info("ApplicationStatus enum migration complete")
    except Exception as e:
        # Non-fatal: SQLite doesn't have named enum types; skip silently
        logger.debug("Enum migration skipped (%s: %s)", type(e).__name__, e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_in_threadpool(os.makedirs, settings.UPLOAD_DIR, exist_ok=True)
    await run_in_threadpool(os.makedirs, os.path.join(settings.UPLOAD_DIR, "resumes"), exist_ok=True)
    await run_in_threadpool(os.makedirs, os.path.join(settings.UPLOAD_DIR, "onboarding"), exist_ok=True)
    await run_in_threadpool(os.makedirs, os.path.join(settings.UPLOAD_DIR, "recordings"), exist_ok=True)

    await _migrate_enum_values()

    async def _warmup_db():
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("DB warmup successful")
        except Exception as e:
            logger.warning("DB warmup failed (will retry on first request): %s", e)

    asyncio.ensure_future(_warmup_db())
    logger.info("Application startup complete. CORS origins: %s", settings.ALLOWED_ORIGINS)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": getattr(exc, "code", None)},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"Internal Server Error: {str(exc) or 'An unexpected error occurred'}",
            "type": type(exc).__name__,
        },
    )


os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Core routes
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["auth"])
app.include_router(jobs.router, prefix=f"{settings.API_V1_PREFIX}/jobs", tags=["jobs"])
app.include_router(integrations.router, prefix=f"{settings.API_V1_PREFIX}/integrations", tags=["integrations"])

# Admin routes
app.include_router(admin_users.router, prefix=f"{settings.API_V1_PREFIX}/admin/users", tags=["admin-users"])
app.include_router(admin_jobs.router, prefix=f"{settings.API_V1_PREFIX}/admin/jobs", tags=["admin-jobs"])
app.include_router(linkedin_integration.router, prefix=f"{settings.API_V1_PREFIX}/admin/integrations/linkedin", tags=["admin-integrations-linkedin"])
app.include_router(indeed_integration.router, prefix=f"{settings.API_V1_PREFIX}/admin/integrations/indeed", tags=["admin-integrations-indeed"])

# Hiring workflow routes
app.include_router(candidates.router, prefix=f"{settings.API_V1_PREFIX}/candidates", tags=["candidates"])
app.include_router(applications.router, prefix=f"{settings.API_V1_PREFIX}/applications", tags=["applications"])
app.include_router(interviews.router, prefix=f"{settings.API_V1_PREFIX}/interviews", tags=["interviews"])
app.include_router(onboarding.router, prefix=f"{settings.API_V1_PREFIX}/onboarding", tags=["onboarding"])
app.include_router(uploads.router, prefix=f"{settings.API_V1_PREFIX}/uploads", tags=["uploads"])
app.include_router(langgraph.router, tags=["langgraph"])


@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database_error": str(e)}


@app.get("/")
def root():
    return {"message": "Welcome to Evalyn API"}


if __name__ == "__main__":
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8123, reload=True)
