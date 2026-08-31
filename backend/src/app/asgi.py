


"""ASGI application."""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastmcp import FastMCP

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
    app = FastAPI(
        title="ERP Backend",
        lifespan=lifespan,
    )

    # Register API v1 routes
    app.include_router(api_v1_router)

    # Create MCP server from the FastAPI application
    mcp = FastMCP.from_fastapi(
        app=app,
        name="ERP MCP",
    )

    # Create MCP HTTP application
    mcp_app = mcp.http_app(path="/")

    # Mount MCP server
    app.mount("/mcp-server", mcp_app)

    return app


app = create_app()