"""ASGI application (new structure).

This is the primary entrypoint going forward.
- API routes are served under `/api/v1`.
- LangGraph SDK endpoints remain at the root (no `/api/v1`) for compatibility.

Note: legacy `src/api/main.py` still exists during cleanup, but new deployments
should use `uvicorn src.app.asgi:app`.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastmcp import FastMCP
from src.app.api.v1.router import api_v1_router
from src.app.core.config import settings
from src.app.modules.attendance.jobs.reminders import send_daily_attendance_reminders
# from src.app.ai.routes import langgraph

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = None
    if getattr(settings, "ATTENDANCE_REMINDERS_ENABLED", True):
        from apscheduler.schedulers.asyncio import AsyncIOScheduler

        reminder_hour = getattr(settings, "ATTENDANCE_REMINDER_HOUR_UTC", 11)
        scheduler = AsyncIOScheduler(timezone="UTC")
        scheduler.add_job(
            send_daily_attendance_reminders,
            "cron",
            hour=reminder_hour,
            minute=0,
            id="attendance_daily_reminders",
        )
        scheduler.start()
        logger.info("Attendance reminder job scheduled daily at %02d:00 UTC", reminder_hour)

    yield

    if scheduler:
        scheduler.shutdown(wait=False)


# def create_app() -> FastAPI:
    # mcp_local = FastMCP.from_fastapi(app=app)  # build after app exists, using full app
    # mcp_app = mcp_local.http_app(path="/")
    # # No need to Register this route b/cwe wil use the langgraph cli
    # # app.include_router(langgraph.router, tags=["langgraph"])

    # fastapi_app = FastAPI(title="ERP Backend", lifespan=mcp_app.lifespan)
    # fastapi_app.include_router(api_v1_router)
    # fastapi_app.mount("/mcp", mcp_app)
    # return fastapi_app

def create_app() -> FastAPI:
    temp_app = FastAPI()
    temp_app.include_router(api_v1_router)

    mcp_local = FastMCP.from_fastapi(app=temp_app)
    mcp_app = mcp_local.http_app(path="/")

    fastapi_app = FastAPI(title="ERP Backend", lifespan=mcp_app.lifespan)
    fastapi_app.include_router(api_v1_router)
    fastapi_app.mount("/mcp", mcp_app)
    return fastapi_app


app = create_app()

app = create_app()
