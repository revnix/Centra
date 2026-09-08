from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastmcp import FastMCP
from fastmcp.utilities.lifespan import combine_lifespans

from src.app.api.v1.router import api_v1_router
from src.app.core.config import settings
from src.app.modules.attendance.jobs.reminders import (
    send_daily_attendance_reminders,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = None

    if getattr(settings, "ATTENDANCE_REMINDERS_ENABLED", True):
        from apscheduler.schedulers.asyncio import AsyncIOScheduler

        reminder_hour = getattr(
            settings,
            "ATTENDANCE_REMINDER_HOUR_UTC",
            11,
        )

        scheduler = AsyncIOScheduler(timezone="UTC")

        scheduler.add_job(
            send_daily_attendance_reminders,
            "cron",
            hour=reminder_hour,
            minute=0,
            id="attendance_daily_reminders",
        )

        scheduler.start()

        logger.info(
            "Attendance reminder job scheduled daily at %02d:00 UTC",
            reminder_hour,
        )

    yield

    if scheduler:
        scheduler.shutdown(wait=False)


def create_app() -> FastAPI:

    # Get the FastMCP instance
    from src.app.mcp.server import mcp as centra_mcp

    # Create the MCP ASGI application
    mcp_app = centra_mcp.http_app(path="/")

    # Combine your existing lifespan with FastMCP lifespan
    combined_lifespan = combine_lifespans(
        lifespan,
        mcp_app.lifespan,
    )

    # Create FastAPI with the combined lifespan
    app = FastAPI(
        title="Centra ERP Backend",
        lifespan=combined_lifespan,
    )

    # Register API v1 routes
    app.include_router(api_v1_router)

    # Mount FastMCP
    app.mount("/mcp", mcp_app)

    logger.info("Mounted FastMCP server at /mcp")

    return app


app = create_app()