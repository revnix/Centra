"""
Interview Scheduling & Feedback Panel — API Routes

All routes are mounted under /api/v1 (see main.py).

Endpoint summary
────────────────
POST   /applications/{id}/schedule              Schedule a new human interview
GET    /applications/{id}/schedule              Get schedule for an application
PATCH  /applications/{id}/schedule              Update schedule / swap panelists
DELETE /applications/{id}/schedule              Cancel an interview schedule
POST   /applications/{id}/schedule/feedback     Panelist submits feedback
GET    /applications/{id}/schedule/feedback     HR views all feedback
GET    /interview-schedules/my                  Reviewer: my upcoming interviews
GET    /interview-schedules/{schedule_id}       Get schedule by its own PK
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.core.dependencies import get_current_user
from src.api.db.session import get_db
from src.api.models.user import User, UserRole
from src.api.schemas.interview_schedule import (
    FeedbackCreate,
    FeedbackResponse,
    InterviewScheduleResponse,
    NotifyLeadsRequest,
    PublicFeedbackCreate,
    PublicInterviewScheduleResponse,
    ScheduleInterviewRequest,
    UpdateScheduleRequest,
)
from src.api.services.interview_schedule_service import InterviewScheduleService

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
#  Helper: role guard
# ─────────────────────────────────────────────────────────────────────────────

def _require_hr(current_user: User) -> None:
    """Raise 403 if the caller is not an admin or reviewer."""
    if current_user.role not in (UserRole.ADMIN, UserRole.REVIEWER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or reviewer users can manage interview schedules",
        )


# ─────────────────────────────────────────────────────────────────────────────
#  Schedule CRUD
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/applications/{application_id}/schedule",
    response_model=InterviewScheduleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a human-led interview for an application",
)
async def create_interview_schedule(
    application_id: int,
    body: ScheduleInterviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new interview schedule for an application.

    - Sets `application.status` → `INTERVIEW_SCHEDULED`
    - Assigns the provided panelists (must be admin/reviewer users)
    - Optionally sends a confirmation email to the candidate (`notify_candidate=true`)

    Only one schedule per application is allowed. Use **PATCH** to update.
    """
    _require_hr(current_user)
    service = InterviewScheduleService(db)
    try:
        return await service.create_schedule(application_id, current_user.id, body)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get(
    "/applications/{application_id}/schedule",
    response_model=InterviewScheduleResponse,
    summary="Get interview schedule for an application",
)
async def get_interview_schedule(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve the interview schedule (with panelists and all feedback entries)
    for a given application.
    """
    _require_hr(current_user)
    service = InterviewScheduleService(db)
    result = await service.get_schedule_by_application(application_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No interview schedule found for application {application_id}",
        )
    return result


@router.patch(
    "/applications/{application_id}/schedule",
    response_model=InterviewScheduleResponse,
    summary="Update an interview schedule",
)
async def update_interview_schedule(
    application_id: int,
    body: UpdateScheduleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Partially update an existing interview schedule.

    - Supply only the fields you want to change.
    - Providing `panelist_user_ids` **replaces** the entire panelist list.
    - Set `notify_candidate=true` to re-send a confirmation email.
    """
    _require_hr(current_user)
    service = InterviewScheduleService(db)
    try:
        return await service.update_schedule(application_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete(
    "/applications/{application_id}/schedule",
    status_code=status.HTTP_200_OK,
    summary="Cancel an interview schedule",
)
async def cancel_interview_schedule(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel (soft-delete) the interview schedule for an application.
    The record is kept in the database with `status=CANCELLED` for audit.
    Only **admin** users may cancel a schedule.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can cancel an interview schedule",
        )
    service = InterviewScheduleService(db)
    try:
        result = await service.cancel_schedule(application_id)
        return {"message": "Interview schedule cancelled", "schedule": result}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
#  Feedback
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/applications/{application_id}/schedule/feedback",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit post-interview feedback (panelists only)",
)
async def submit_interview_feedback(
    application_id: int,
    body: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit structured feedback for a completed human interview.

    **Rules:**
    - Caller must be registered as a panelist for this schedule.
    - Each panelist can submit exactly **one** feedback entry.
    - When all panelists have submitted, the schedule auto-transitions to `COMPLETED`.

    **Ratings** are 1–5 (1 = poor, 5 = excellent).
    """
    _require_hr(current_user)
    service = InterviewScheduleService(db)
    try:
        return await service.submit_feedback(
            application_id, current_user.id, body
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get(
    "/applications/{application_id}/schedule/feedback",
    response_model=List[FeedbackResponse],
    summary="List all feedback for an application's interview",
)
async def list_interview_feedback(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all feedback entries submitted by panelists for this application's
    interview schedule. Includes the panelist's name and email for reference.
    """
    _require_hr(current_user)
    service = InterviewScheduleService(db)
    return await service.get_feedback_for_application(application_id)


# ─────────────────────────────────────────────────────────────────────────────
#  Reviewer: my interviews
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/interview-schedules/my",
    response_model=List[InterviewScheduleResponse],
    summary="Get all interviews where I am a panelist",
)
async def my_interview_schedules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all scheduled interviews where the authenticated user has been
    assigned as a panelist. Ordered by `scheduled_at` ascending.

    Useful for a reviewer's personal **"My Upcoming Interviews"** dashboard widget.
    """
    _require_hr(current_user)
    service = InterviewScheduleService(db)
    return await service.list_schedules_for_panelist(current_user.id)


@router.get(
    "/interview-schedules/{schedule_id}",
    response_model=InterviewScheduleResponse,
    summary="Get interview schedule by its ID",
)
async def get_schedule_by_id(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve an interview schedule directly by its own primary key.
    """
    _require_hr(current_user)
    service = InterviewScheduleService(db)
    result = await service.get_schedule_by_id(schedule_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview schedule {schedule_id} not found",
        )
    return result


@router.post(
    "/applications/{application_id}/notify-leads",
    status_code=status.HTTP_200_OK,
    summary="Send interview notification emails to assigned department leads",
)
async def notify_department_leads(
    application_id: int,
    body: NotifyLeadsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Dispatches interview details & feedback dashboard link to selected department leads.
    """
    _require_hr(current_user)
    from src.api.services.email_service import send_email

    sent_count = 0
    html_message = body.message.replace("\n", "<br/>")
    html_content = f"""
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;color:#334155;line-height:1.6;">
        <h2 style="color:#4f46e5;margin-top:0;">Interview Panel Assignment</h2>
        {html_message}
    </div>
    """

    for email in body.lead_emails:
        if email and email.strip():
            res = await send_email(to_email=email.strip(), subject=body.subject, html_content=html_content)
            if res:
                sent_count += 1

    return {"message": f"Successfully notified {sent_count} lead(s)", "sent_count": sent_count}


@router.get(
    "/interview-schedules/public/{application_id}",
    response_model=PublicInterviewScheduleResponse,
    summary="Public endpoint: Get interview schedule details for panelist feedback page",
)
async def get_public_schedule(
    application_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Public (unauthenticated) route used by department leads to fetch interview & candidate info.
    """
    service = InterviewScheduleService(db)
    try:
        return await service.get_public_schedule_info(application_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post(
    "/interview-schedules/public/{application_id}/feedback",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Public endpoint: Department lead submits post-interview feedback",
)
async def submit_public_feedback(
    application_id: int,
    body: PublicFeedbackCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Public (unauthenticated) route allowing department leads to submit feedback via their email.
    """
    service = InterviewScheduleService(db)
    try:
        return await service.submit_public_feedback(
            application_id, body.lead_email, body.reviewer_name, body
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


