"""Phase 6 — daily attendance reminders.

No scheduling infrastructure existed anywhere in this codebase before this:
`src/app/jobs/tasks/email_reply_poller.py` defines `check_for_replies()` /
`check_timeouts()`, but nothing anywhere calls either — it's dead code, not
a working scheduler to build on. This wires an in-process APScheduler job
(Option A from ATTENDANCE_IMPLEMENTATION_PLAN.md's Phase 6) instead of an
external cron + endpoint (Option B) — there's no cron runner for this
deployment either, so Option A is the smaller addition. See `asgi.py` for
where this gets started.
"""

from __future__ import annotations

import logging
from datetime import date

from src.app.db.session import AsyncSessionLocal
from src.app.integrations.email.services.service import send_email
from src.app.modules.attendance.services.attendance_service import AttendanceService

logger = logging.getLogger(__name__)


async def send_daily_attendance_reminders() -> int:
    """Emails everyone with a shift assigned for today who hasn't checked
    in yet. A single daily digest, not per-shift timing (see the
    ATTENDANCE_REMINDER_HOUR_UTC docstring in config_legacy.py) — a v1
    simplification. Returns the number of reminders sent (used by tests
    and logged for visibility; the scheduler itself ignores the return).
    """
    async with AsyncSessionLocal() as db:
        svc = AttendanceService(db)
        today = date.today()
        missing = await svc.get_employees_missing_checkin(today)

        sent = 0
        for user in missing:
            if not user.email:
                continue
            await send_email(
                to_email=user.email,
                subject="Reminder: you haven't checked in today",
                html_content=(
                    f"<p>Hi {user.full_name or user.username},</p>"
                    f"<p>We don't see a check-in for you today "
                    f"({today.isoformat()}). If this is a mistake, please "
                    "check in now, or let HR know if you're on approved "
                    "leave or an untracked day.</p>"
                ),
            )
            sent += 1

        logger.info("Attendance reminders: sent %d for %s", sent, today.isoformat())
        return sent
