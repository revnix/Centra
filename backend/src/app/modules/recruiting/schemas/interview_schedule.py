"""
Pydantic schemas for Interview Scheduling & Feedback Panel.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.app.modules.recruiting.models.interview_schedule import HireRecommendation, ScheduleStatus


# ─────────────────────────────────────────────
#  Panelist schemas
# ─────────────────────────────────────────────

class PanelistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    full_name: Optional[str] = None
    email: Optional[str] = None
    assigned_at: Optional[datetime] = None

    @classmethod
    def from_orm_with_user(cls, panelist) -> "PanelistResponse":
        """Build response from InterviewPanelist ORM object (with .user loaded)."""
        user = panelist.user
        return cls(
            id=panelist.id,
            user_id=panelist.user_id,
            full_name=user.full_name if user else None,
            email=user.email if user else None,
            assigned_at=panelist.assigned_at,
        )


# ─────────────────────────────────────────────
#  Feedback schemas
# ─────────────────────────────────────────────

class FeedbackCreate(BaseModel):
    """Body sent by a panelist when submitting their post-interview feedback."""

    overall_rating: int = Field(..., ge=1, le=5, description="1–5 overall impression")
    technical_rating: Optional[int] = Field(None, ge=1, le=5, description="1–5 technical score")
    communication_rating: Optional[int] = Field(None, ge=1, le=5, description="1–5 communication score")
    culture_fit_rating: Optional[int] = Field(None, ge=1, le=5, description="1–5 culture fit score")
    recommendation: HireRecommendation
    strengths: Optional[str] = Field(None, max_length=2000)
    concerns: Optional[str] = Field(None, max_length=2000)
    notes: Optional[str] = Field(None, max_length=2000)


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    schedule_id: int
    panelist_id: int
    panelist_full_name: Optional[str] = None
    panelist_email: Optional[str] = None

    overall_rating: int
    technical_rating: Optional[int] = None
    communication_rating: Optional[int] = None
    culture_fit_rating: Optional[int] = None
    recommendation: HireRecommendation
    strengths: Optional[str] = None
    concerns: Optional[str] = None
    notes: Optional[str] = None
    submitted_at: Optional[datetime] = None

    @classmethod
    def from_orm_with_panelist(cls, fb) -> "FeedbackResponse":
        """Build response from InterviewFeedback ORM object (with .panelist loaded)."""
        user = fb.panelist
        return cls(
            id=fb.id,
            schedule_id=fb.schedule_id,
            panelist_id=fb.panelist_id,
            panelist_full_name=user.full_name if user else None,
            panelist_email=user.email if user else None,
            overall_rating=fb.overall_rating,
            technical_rating=fb.technical_rating,
            communication_rating=fb.communication_rating,
            culture_fit_rating=fb.culture_fit_rating,
            recommendation=fb.recommendation,
            strengths=fb.strengths,
            concerns=fb.concerns,
            notes=fb.notes,
            submitted_at=fb.submitted_at,
        )


# ─────────────────────────────────────────────
#  Schedule schemas
# ─────────────────────────────────────────────

class ScheduleInterviewRequest(BaseModel):
    """Body for POST /applications/{id}/schedule — create a new interview schedule."""

    scheduled_at: datetime = Field(..., description="Interview date and time (ISO-8601 with timezone)")
    duration_minutes: int = Field(60, ge=15, le=480, description="Duration in minutes (15–480)")
    location: Optional[str] = Field(None, max_length=255, description='E.g. "Office – Room 3" or "Zoom"')
    meeting_link: Optional[str] = Field(None, max_length=1024, description="Video call URL")
    notes: Optional[str] = Field(None, max_length=4000, description="Internal HR notes")
    panelist_user_ids: List[int] = Field(
        default_factory=list,
        description="List of User IDs (admin/reviewer) who will conduct the interview",
    )
    notify_candidate: bool = Field(
        True,
        description="If true, send an automated schedule confirmation email to the candidate",
    )

    @field_validator("scheduled_at")
    @classmethod
    def must_be_future(cls, v: datetime) -> datetime:
        from datetime import timezone
        now = datetime.now(timezone.utc)
        # Make naive datetimes UTC-aware for comparison
        aware_v = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        if aware_v <= now:
            raise ValueError("scheduled_at must be a future date/time")
        return v


class NotifyLeadsRequest(BaseModel):
    """Body for POST /applications/{id}/notify-leads."""
    lead_emails: List[str] = Field(..., min_length=1)
    subject: str = Field(...)
    message: str = Field(...)



class UpdateScheduleRequest(BaseModel):
    """Body for PATCH /applications/{id}/schedule — partial update."""

    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=480)
    location: Optional[str] = Field(None, max_length=255)
    meeting_link: Optional[str] = Field(None, max_length=1024)
    notes: Optional[str] = Field(None, max_length=4000)
    panelist_user_ids: Optional[List[int]] = Field(
        None,
        description="Replaces the entire panelist list when provided",
    )
    status: Optional[ScheduleStatus] = None
    notify_candidate: bool = Field(
        False,
        description="If true, re-send schedule confirmation email to the candidate",
    )


class InterviewScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    scheduled_at: datetime
    duration_minutes: int
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    notes: Optional[str] = None
    status: ScheduleStatus
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    panelists: List[PanelistResponse] = []
    feedback_entries: List[FeedbackResponse] = []

    # Convenience aggregates computed by the service
    feedback_submitted_count: int = 0
    panelist_count: int = 0
    all_feedback_submitted: bool = False


class InterviewScheduleSummary(BaseModel):
    """Lightweight version embedded inside ApplicationResponse."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    scheduled_at: datetime
    duration_minutes: int
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    status: ScheduleStatus
    panelist_count: int = 0
    feedback_submitted_count: int = 0

    @classmethod
    def from_orm(cls, obj) -> "InterviewScheduleSummary":
        return cls(
            id=obj.id,
            application_id=obj.application_id,
            scheduled_at=obj.scheduled_at,
            duration_minutes=obj.duration_minutes,
            location=obj.location,
            meeting_link=obj.meeting_link,
            status=obj.status,
            panelist_count=len(obj.panelists) if obj.panelists is not None else 0,
            feedback_submitted_count=len(obj.feedback_entries) if obj.feedback_entries is not None else 0,
        )


class PublicInterviewScheduleResponse(BaseModel):
    """Response schema for public feedback page."""
    application_id: int
    candidate_name: str
    candidate_email: str
    job_title: str
    scheduled_at: datetime
    duration_minutes: int
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    notes: Optional[str] = None
    status: ScheduleStatus


class PublicFeedbackCreate(BaseModel):
    """Body sent by department lead on the unauthenticated public feedback page."""
    lead_email: str = Field(..., description="Email address of reviewing department lead")
    reviewer_name: Optional[str] = None
    overall_rating: int = Field(..., ge=1, le=5)
    technical_rating: Optional[int] = Field(None, ge=1, le=5)
    communication_rating: Optional[int] = Field(None, ge=1, le=5)
    culture_fit_rating: Optional[int] = Field(None, ge=1, le=5)
    recommendation: HireRecommendation
    strengths: Optional[str] = Field(None, max_length=2000)
    concerns: Optional[str] = Field(None, max_length=2000)
    notes: Optional[str] = Field(None, max_length=2000)


