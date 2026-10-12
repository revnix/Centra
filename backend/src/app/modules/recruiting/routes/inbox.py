"""
routes/inbox.py
───────────────
Smart HR Inbox — two endpoints:

  GET /api/v1/inbox/summary   → badge counts only (sidebar / nav)
  GET /api/v1/inbox           → full categorised feed

Both endpoints are restricted to ADMIN and REVIEWER roles.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.db.session import get_db
from src.app.core.dependencies import get_current_user
from src.app.modules.platform.users.models.user import User, UserRole
from src.app.modules.recruiting.services.inbox_service import InboxService

logger = logging.getLogger(__name__)

router = APIRouter()


def _require_hr(current_user: User) -> None:
    """Raise 403 if the caller is not an admin or reviewer."""
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(status_code=403, detail="HR access required")


# ── Endpoint 1: Summary (badge counts) ───────────────────────────────────────

@router.get("/summary")
async def get_inbox_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns lightweight badge counts for the sidebar navigation.

    Response:
    {
      "urgent": 3,
      "today":  2,
      "new":    7,
      "total":  12
    }

    Call this on every page load to keep sidebar numbers current.
    Designed to be fast — only COUNT queries, no data loading.
    """
    _require_hr(current_user)
    try:
        service = InboxService(db)
        return await service.get_summary()
    except Exception as e:
        logger.error(f"[Inbox] Summary failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load inbox summary")


# ── Endpoint 2: Full inbox feed ───────────────────────────────────────────────

@router.get("")
async def get_inbox(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the full inbox feed, split into three categories.

    Response shape:
    {
      "summary": {
        "urgent": 3,
        "today":  2,
        "new":    7,
        "total":  12
      },
      "items": {
        "urgent": [ <InboxItem>, ... ],
        "today":  [ <InboxItem>, ... ],
        "new":    [ <InboxItem>, ... ]
      }
    }

    InboxItem fields:
      id              string   Unique item key e.g. "app_42"
      type            string   Always "application" for now
      category        string   "URGENT" | "TODAY" | "NEW"
      priority        int      1=URGENT, 2=TODAY, 3=NEW
      headline        string   Primary display text
      sub_text        string   Secondary display text
      hours_waiting   int|null Hours since last HR action (URGENT / offer items)
      candidate       object   { id, name, email }
      job             object   { id, title }
      application_id  int      Direct application ID
      status          string   Current ApplicationStatus value
      match_score     int|null AI ATS score (0–100)
      source          string   "web" | "linkedin" | "indeed" | etc.
      email_status    string   "PENDING" | "SENT" | "FAILED" | "SKIPPED"
      created_at      string   ISO-8601 datetime
      updated_at      string|null ISO-8601 datetime or null
      action_url      string   Frontend route to navigate to on click
                               e.g. "/dashboard/applications/42"
    """
    _require_hr(current_user)
    if limit < 1 or limit > 200:
        limit = 50
    try:
        service = InboxService(db)
        return await service.get_inbox(limit_per_category=limit)
    except Exception as e:
        logger.error(f"[Inbox] Full feed failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load inbox")
