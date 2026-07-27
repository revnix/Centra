"""
inbox_service.py
────────────────
Smart HR Inbox — unified notification feed for HR.

Categories
──────────
  URGENT  🔴  Applications stuck >48 h without an HR action
  TODAY   🟡  Interviews happening today + offers expiring within 48 h
  NEW     🟢  Applications submitted in the last 24 h (APPLIED / SCREENING)

Every item carries enough context so the frontend can deep-link directly
to the relevant page without a follow-up API call.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Literal

from sqlalchemy import and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload, noload

from src.api.models.application import Application, ApplicationStatus
from src.api.models.interview import InterviewSession, InterviewStatus
from src.api.models.onboarding import Onboarding, OnboardingStatus
from src.api.models.job import Posts
from src.api.models.user import User

logger = logging.getLogger(__name__)

# ── Thresholds ────────────────────────────────────────────────────────────────
URGENT_STALE_HOURS = 48          # application untouched longer than this → URGENT
TODAY_OFFER_EXPIRY_HOURS = 48    # offer extended but no acceptance within this window → TODAY

# ── Statuses that mean "HR has not acted yet" ─────────────────────────────────
STALE_STATUSES = [
    ApplicationStatus.APPLIED,
    ApplicationStatus.SCREENING,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.INTERVIEW_INVITED,
    ApplicationStatus.INTERVIEW_COMPLETED,
    ApplicationStatus.REFERENCE_CHECK,
]

# ── Statuses counted as "brand new" ──────────────────────────────────────────
NEW_STATUSES = [
    ApplicationStatus.APPLIED,
    ApplicationStatus.SCREENING,
]

InboxCategory = Literal["URGENT", "TODAY", "NEW"]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _fmt(dt: datetime | None) -> str | None:
    """Return ISO-8601 string or None."""
    return dt.isoformat() if dt else None


def _application_deep_link(application_id: int) -> str:
    return f"/dashboard/applications/{application_id}"


def _onboarding_deep_link(application_id: int) -> str:
    return f"/dashboard/onboarding/{application_id}"


class InboxService:
    """
    Produces a structured inbox feed for HR dashboards.
    All queries are async and use explicit joins — no lazy loading.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    async def get_inbox(self, limit_per_category: int = 50) -> dict:
        """
        Return the full inbox payload:

        {
          "summary": { "urgent": int, "today": int, "new": int, "total": int },
          "items": {
            "urgent": [...],
            "today":  [...],
            "new":    [...]
          }
        }
        """
        urgent_items = await self._get_urgent(limit_per_category)
        today_items  = await self._get_today(limit_per_category)
        new_items    = await self._get_new(limit_per_category)

        return {
            "summary": {
                "urgent": len(urgent_items),
                "today":  len(today_items),
                "new":    len(new_items),
                "total":  len(urgent_items) + len(today_items) + len(new_items),
            },
            "items": {
                "urgent": urgent_items,
                "today":  today_items,
                "new":    new_items,
            },
        }

    async def get_summary(self) -> dict:
        """
        Lightweight endpoint — returns only the counts (used for badge numbers
        in the sidebar navigation, called on every page load).
        """
        now = _now()
        cutoff_urgent = now - timedelta(hours=URGENT_STALE_HOURS)
        cutoff_new    = now - timedelta(hours=24)

        # Count URGENT
        urgent_q = (
            select(func.count())
            .select_from(Application)
            .where(
                Application.status.in_(STALE_STATUSES),
                or_(
                    Application.updated_at <= cutoff_urgent,
                    and_(
                        Application.updated_at.is_(None),
                        Application.created_at <= cutoff_urgent,
                    ),
                ),
            )
        )
        urgent_count = (await self.db.execute(urgent_q)).scalar() or 0

        # Count TODAY (interviews today)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end   = today_start + timedelta(days=1)
        interview_today_q = (
            select(func.count())
            .select_from(Application)
            .where(Application.status == ApplicationStatus.INTERVIEW_SCHEDULED)
            .join(
                InterviewSession,
                InterviewSession.application_id == Application.id,
                isouter=True,
            )
        )
        interview_today_count = (await self.db.execute(interview_today_q)).scalar() or 0

        # Count NEW (last 24 h)
        new_q = (
            select(func.count())
            .select_from(Application)
            .where(
                Application.status.in_(NEW_STATUSES),
                Application.created_at >= cutoff_new,
            )
        )
        new_count = (await self.db.execute(new_q)).scalar() or 0

        today_count = interview_today_count  # extend later with offer expiry count

        return {
            "urgent": urgent_count,
            "today":  today_count,
            "new":    new_count,
            "total":  urgent_count + today_count + new_count,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Category helpers
    # ─────────────────────────────────────────────────────────────────────────

    async def _get_urgent(self, limit: int) -> list[dict]:
        """
        Applications in an "action-required" status that have not been
        touched by HR for more than URGENT_STALE_HOURS hours.
        """
        now = _now()
        cutoff = now - timedelta(hours=URGENT_STALE_HOURS)

        # Use (updated_at ?? created_at) as the "last touched" timestamp.
        last_touch = func.coalesce(Application.updated_at, Application.created_at)

        stmt = (
            select(Application)
            .options(
                joinedload(Application.candidate),
                joinedload(Application.job),
                noload(Application.interview_session),
            )
            .where(
                Application.status.in_(STALE_STATUSES),
                last_touch <= cutoff,
            )
            .order_by(last_touch.asc())   # oldest first
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        applications = result.scalars().all()

        items = []
        for app in applications:
            last_touched_at = app.updated_at or app.created_at
            hours_waiting = int((now - last_touched_at).total_seconds() / 3600)

            items.append(
                self._build_application_item(
                    app=app,
                    category="URGENT",
                    headline=f"{app.candidate.full_name or 'Candidate'} waiting {hours_waiting}h",
                    sub_text=f"Still in {app.status.value.replace('_', ' ').title()} — no action taken",
                    priority=1,
                    hours_waiting=hours_waiting,
                )
            )

        return items

    async def _get_today(self, limit: int) -> list[dict]:
        """
        Two sources of TODAY items:
        1. Applications with INTERVIEW_SCHEDULED status
           (interview is expected to happen today or soon)
        2. Applications with OFFER_EXTENDED status that are >OFFER_EXPIRY threshold old
        """
        now = _now()
        offer_expiry_cutoff = now - timedelta(hours=TODAY_OFFER_EXPIRY_HOURS)

        # ── 1. Interview Scheduled applications ───────────────────────────────
        interview_stmt = (
            select(Application)
            .options(
                joinedload(Application.candidate),
                joinedload(Application.job),
                noload(Application.interview_session),
            )
            .where(Application.status == ApplicationStatus.INTERVIEW_SCHEDULED)
            .order_by(Application.updated_at.desc())
            .limit(limit)
        )
        interview_result = await self.db.execute(interview_stmt)
        interview_apps = interview_result.scalars().all()

        # ── 2. Pending offers ─────────────────────────────────────────────────
        offer_stmt = (
            select(Application)
            .options(
                joinedload(Application.candidate),
                joinedload(Application.job),
                noload(Application.interview_session),
            )
            .where(
                Application.status == ApplicationStatus.OFFER_EXTENDED,
                func.coalesce(Application.updated_at, Application.created_at) <= offer_expiry_cutoff,
            )
            .order_by(Application.updated_at.asc())
            .limit(limit)
        )
        offer_result = await self.db.execute(offer_stmt)
        offer_apps = offer_result.scalars().all()

        items = []

        for app in interview_apps:
            items.append(
                self._build_application_item(
                    app=app,
                    category="TODAY",
                    headline=f"Interview: {app.candidate.full_name or 'Candidate'}",
                    sub_text=f"Scheduled for {app.job.title if app.job else 'a position'}",
                    priority=2,
                )
            )

        for app in offer_apps:
            last_touched = app.updated_at or app.created_at
            hours_since_offer = int((now - last_touched).total_seconds() / 3600)
            items.append(
                self._build_application_item(
                    app=app,
                    category="TODAY",
                    headline=f"Offer Pending: {app.candidate.full_name or 'Candidate'}",
                    sub_text=f"Offer extended {hours_since_offer}h ago, awaiting acceptance",
                    priority=2,
                    hours_waiting=hours_since_offer,
                )
            )

        return items[:limit]

    async def _get_new(self, limit: int) -> list[dict]:
        """
        Fresh applications submitted in the last 24 hours.
        Only APPLIED and SCREENING statuses are considered "new".
        """
        cutoff = _now() - timedelta(hours=24)

        stmt = (
            select(Application)
            .options(
                joinedload(Application.candidate),
                joinedload(Application.job),
                noload(Application.interview_session),
            )
            .where(
                Application.status.in_(NEW_STATUSES),
                Application.created_at >= cutoff,
            )
            .order_by(Application.created_at.desc())   # newest first
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        applications = result.scalars().all()

        items = []
        for app in applications:
            items.append(
                self._build_application_item(
                    app=app,
                    category="NEW",
                    headline=f"New Application: {app.candidate.full_name or 'Candidate'}",
                    sub_text=f"Applied for {app.job.title if app.job else 'a position'}"
                             + (f" · Score: {int(app.match_score)}" if app.match_score else ""),
                    priority=3,
                )
            )

        return items

    # ─────────────────────────────────────────────────────────────────────────
    # Item builder
    # ─────────────────────────────────────────────────────────────────────────

    def _build_application_item(
        self,
        app: Application,
        category: InboxCategory,
        headline: str,
        sub_text: str,
        priority: int,
        hours_waiting: int | None = None,
    ) -> dict:
        """
        Builds a single inbox item dict.
        The `action_url` points directly to the candidate's application page
        so the frontend can navigate without any extra lookup.
        """
        candidate = app.candidate
        job       = app.job

        return {
            # ── Identity ──────────────────────────────────────────────────────
            "id":             f"app_{app.id}",
            "type":           "application",
            "category":       category,       # "URGENT" | "TODAY" | "NEW"
            "priority":       priority,

            # ── Display ───────────────────────────────────────────────────────
            "headline":       headline,
            "sub_text":       sub_text,
            "hours_waiting":  hours_waiting,

            # ── Candidate info ────────────────────────────────────────────────
            "candidate": {
                "id":         candidate.id if candidate else None,
                "name":       candidate.full_name if candidate else "Unknown",
                "email":      candidate.email if candidate else None,
            },

            # ── Job info ──────────────────────────────────────────────────────
            "job": {
                "id":    job.id if job else None,
                "title": job.title if job else "Unknown Position",
            },

            # ── Application state ────────────────────────────────────────────
            "application_id":   app.id,
            "status":           app.status.value,
            "match_score":      int(app.match_score) if app.match_score is not None else None,
            "source":           app.source,
            "email_status":     app.email_delivery_status,

            # ── Timestamps ────────────────────────────────────────────────────
            "created_at":       _fmt(app.created_at),
            "updated_at":       _fmt(app.updated_at),

            # ── Deep-link (frontend navigates here on click) ─────────────────
            "action_url":       _application_deep_link(app.id),
        }
