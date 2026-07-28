"""
Interview Schedule Service

Handles all business logic for human-led interview scheduling:
  - Creating/updating/cancelling schedules
  - Managing panelists
  - Accepting and storing structured feedback
  - Sending candidate notification emails
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.models.application import Application, ApplicationStatus
from src.api.models.interview_schedule import (
    HireRecommendation,
    InterviewFeedback,
    InterviewPanelist,
    InterviewSchedule,
    ScheduleStatus,
)
from src.api.models.user import User, UserRole
from src.api.schemas.interview_schedule import (
    FeedbackCreate,
    FeedbackResponse,
    InterviewScheduleResponse,
    PanelistResponse,
    ScheduleInterviewRequest,
    UpdateScheduleRequest,
)

logger = logging.getLogger(__name__)


class InterviewScheduleService:
    """All database operations for the interview scheduling & feedback panel."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ──────────────────────────────────────────────────
    #  Internal helpers
    # ──────────────────────────────────────────────────

    async def _get_schedule_orm(
        self, schedule_id: int, load_relations: bool = True
    ) -> Optional[InterviewSchedule]:
        """Fetch a single InterviewSchedule by PK with panelists + feedback loaded."""
        q = select(InterviewSchedule).where(InterviewSchedule.id == schedule_id)
        if load_relations:
            q = q.options(
                selectinload(InterviewSchedule.panelists).selectinload(
                    InterviewPanelist.user
                ),
                selectinload(InterviewSchedule.feedback_entries).selectinload(
                    InterviewFeedback.panelist
                ),
                selectinload(InterviewSchedule.creator),
            )
        result = await self.db.execute(q)
        return result.scalars().first()

    async def _get_schedule_for_application_orm(
        self, application_id: int
    ) -> Optional[InterviewSchedule]:
        """Fetch the InterviewSchedule linked to an application (with relations)."""
        result = await self.db.execute(
            select(InterviewSchedule)
            .where(InterviewSchedule.application_id == application_id)
            .options(
                selectinload(InterviewSchedule.panelists).selectinload(
                    InterviewPanelist.user
                ),
                selectinload(InterviewSchedule.feedback_entries).selectinload(
                    InterviewFeedback.panelist
                ),
                selectinload(InterviewSchedule.creator),
            )
        )
        return result.scalars().first()

    def _build_response(self, schedule: InterviewSchedule) -> InterviewScheduleResponse:
        """Convert ORM object to response schema, computing aggregate fields."""
        panelist_responses = [
            PanelistResponse.from_orm_with_user(p) for p in (schedule.panelists or [])
        ]
        feedback_responses = [
            FeedbackResponse.from_orm_with_panelist(f)
            for f in (schedule.feedback_entries or [])
        ]
        panelist_count = len(panelist_responses)
        feedback_count = len(feedback_responses)

        return InterviewScheduleResponse(
            id=schedule.id,
            application_id=schedule.application_id,
            scheduled_at=schedule.scheduled_at,
            duration_minutes=schedule.duration_minutes,
            location=schedule.location,
            meeting_link=schedule.meeting_link,
            notes=schedule.notes,
            status=schedule.status,
            created_by=schedule.created_by,
            created_at=schedule.created_at,
            updated_at=schedule.updated_at,
            panelists=panelist_responses,
            feedback_entries=feedback_responses,
            panelist_count=panelist_count,
            feedback_submitted_count=feedback_count,
            all_feedback_submitted=(panelist_count > 0 and feedback_count >= panelist_count),
        )

    async def _replace_panelists(
        self, schedule: InterviewSchedule, user_ids: List[int]
    ) -> None:
        """Delete existing panelists for the schedule and create new ones."""
        await self.db.execute(
            delete(InterviewPanelist).where(
                InterviewPanelist.schedule_id == schedule.id
            )
        )
        for uid in user_ids:
            self.db.add(InterviewPanelist(schedule_id=schedule.id, user_id=uid))

    # ──────────────────────────────────────────────────
    #  Public API
    # ──────────────────────────────────────────────────

    async def create_schedule(
        self,
        application_id: int,
        hr_user_id: int,
        data: ScheduleInterviewRequest,
    ) -> InterviewScheduleResponse:
        """
        Schedule a human-led interview for an application.

        Side-effects:
        - Sets application.status = INTERVIEW_SCHEDULED
        - Optionally emails the candidate a confirmation
        """
        # Validate application exists
        result = await self.db.execute(
            select(Application)
            .options(
                selectinload(Application.candidate),
                selectinload(Application.job),
            )
            .where(Application.id == application_id)
        )
        application = result.scalars().first()
        if not application:
            raise ValueError(f"Application {application_id} not found")

        # Guard: only one schedule per application
        existing = await self._get_schedule_for_application_orm(application_id)
        if existing:
            raise ValueError(
                "An interview schedule already exists for this application. "
                "Use PATCH to update it."
            )

        # Validate panelist user IDs exist and are admin/reviewer
        if data.panelist_user_ids:
            await self._validate_panelist_users(data.panelist_user_ids)

        # Create schedule
        schedule = InterviewSchedule(
            application_id=application_id,
            scheduled_at=data.scheduled_at,
            duration_minutes=data.duration_minutes,
            location=data.location,
            meeting_link=data.meeting_link,
            notes=data.notes,
            status=ScheduleStatus.SCHEDULED,
            created_by=hr_user_id,
        )
        self.db.add(schedule)
        await self.db.flush()  # get schedule.id without committing

        # Add panelists
        for uid in data.panelist_user_ids:
            self.db.add(InterviewPanelist(schedule_id=schedule.id, user_id=uid))

        # Update application pipeline status
        application.status = ApplicationStatus.INTERVIEW_SCHEDULED
        self.db.add(application)

        await self.db.commit()

        # Reload with all relations for the response
        schedule = await self._get_schedule_orm(schedule.id)

        # Optionally notify candidate
        if data.notify_candidate and application.candidate:
            await self._send_candidate_schedule_email(application, schedule)

        return self._build_response(schedule)

    async def get_schedule_by_application(
        self, application_id: int
    ) -> Optional[InterviewScheduleResponse]:
        """Get the schedule for an application, or None if not yet scheduled."""
        schedule = await self._get_schedule_for_application_orm(application_id)
        if not schedule:
            return None
        return self._build_response(schedule)

    async def get_schedule_by_id(
        self, schedule_id: int
    ) -> Optional[InterviewScheduleResponse]:
        """Get a schedule by its own PK."""
        schedule = await self._get_schedule_orm(schedule_id)
        if not schedule:
            return None
        return self._build_response(schedule)

    async def update_schedule(
        self,
        application_id: int,
        data: UpdateScheduleRequest,
    ) -> InterviewScheduleResponse:
        """
        Partially update an existing interview schedule.
        When panelist_user_ids is supplied, the panelist list is fully replaced.
        """
        schedule = await self._get_schedule_for_application_orm(application_id)
        if not schedule:
            raise ValueError(
                f"No interview schedule found for application {application_id}"
            )

        if schedule.status == ScheduleStatus.CANCELLED:
            raise ValueError("Cannot update a cancelled schedule. Create a new one.")

        # Apply field updates
        if data.scheduled_at is not None:
            schedule.scheduled_at = data.scheduled_at
        if data.duration_minutes is not None:
            schedule.duration_minutes = data.duration_minutes
        if data.location is not None:
            schedule.location = data.location
        if data.meeting_link is not None:
            schedule.meeting_link = data.meeting_link
        if data.notes is not None:
            schedule.notes = data.notes
        if data.status is not None:
            schedule.status = data.status

        self.db.add(schedule)

        # Replace panelists if provided
        if data.panelist_user_ids is not None:
            await self._validate_panelist_users(data.panelist_user_ids)
            await self._replace_panelists(schedule, data.panelist_user_ids)

        await self.db.commit()

        # Reload
        schedule = await self._get_schedule_orm(schedule.id)

        # Optionally re-notify candidate
        if data.notify_candidate:
            result = await self.db.execute(
                select(Application)
                .options(
                    selectinload(Application.candidate),
                    selectinload(Application.job),
                )
                .where(Application.id == application_id)
            )
            application = result.scalars().first()
            if application and application.candidate:
                await self._send_candidate_schedule_email(application, schedule)

        return self._build_response(schedule)

    async def cancel_schedule(self, application_id: int) -> InterviewScheduleResponse:
        """Mark an interview schedule as CANCELLED."""
        schedule = await self._get_schedule_for_application_orm(application_id)
        if not schedule:
            raise ValueError(
                f"No interview schedule found for application {application_id}"
            )
        schedule.status = ScheduleStatus.CANCELLED
        self.db.add(schedule)
        await self.db.commit()
        schedule = await self._get_schedule_orm(schedule.id)
        return self._build_response(schedule)

    async def submit_feedback(
        self,
        application_id: int,
        panelist_user_id: int,
        data: FeedbackCreate,
    ) -> FeedbackResponse:
        """
        Submit structured post-interview feedback.

        Rules:
        - Only a registered panelist for this schedule may submit feedback.
        - Each panelist may submit only one feedback entry per schedule.
        - When ALL panelists have submitted, the schedule is auto-marked COMPLETED.
        """
        schedule = await self._get_schedule_for_application_orm(application_id)
        if not schedule:
            raise ValueError(
                f"No interview schedule found for application {application_id}"
            )

        if schedule.status == ScheduleStatus.CANCELLED:
            raise ValueError("Cannot submit feedback for a cancelled interview")

        # Check caller is a registered panelist
        panelist_record = next(
            (p for p in schedule.panelists if p.user_id == panelist_user_id),
            None,
        )
        if not panelist_record:
            raise PermissionError(
                "You are not registered as a panelist for this interview"
            )

        # Prevent duplicate submission
        duplicate = next(
            (f for f in schedule.feedback_entries if f.panelist_id == panelist_user_id),
            None,
        )
        if duplicate:
            raise ValueError(
                "You have already submitted feedback for this interview. "
                "Contact HR to have it updated."
            )

        feedback = InterviewFeedback(
            schedule_id=schedule.id,
            panelist_id=panelist_user_id,
            overall_rating=data.overall_rating,
            technical_rating=data.technical_rating,
            communication_rating=data.communication_rating,
            culture_fit_rating=data.culture_fit_rating,
            recommendation=data.recommendation,
            strengths=data.strengths,
            concerns=data.concerns,
            notes=data.notes,
        )
        self.db.add(feedback)
        await self.db.flush()

        # Auto-complete schedule when all panelists have submitted
        total_panelists = len(schedule.panelists)
        total_feedback = len(schedule.feedback_entries) + 1  # +1 for the one we just added
        if total_panelists > 0 and total_feedback >= total_panelists:
            schedule.status = ScheduleStatus.COMPLETED
            self.db.add(schedule)

        await self.db.commit()

        # Reload feedback with panelist user for the response
        fb_result = await self.db.execute(
            select(InterviewFeedback)
            .options(selectinload(InterviewFeedback.panelist))
            .where(InterviewFeedback.id == feedback.id)
        )
        feedback = fb_result.scalars().first()
        return FeedbackResponse.from_orm_with_panelist(feedback)

    async def get_feedback_for_application(
        self, application_id: int
    ) -> List[FeedbackResponse]:
        """Return all feedback entries for an application's schedule."""
        schedule = await self._get_schedule_for_application_orm(application_id)
        if not schedule:
            return []
        return [
            FeedbackResponse.from_orm_with_panelist(f)
            for f in schedule.feedback_entries
        ]

    async def list_schedules_for_panelist(
        self, user_id: int
    ) -> List[InterviewScheduleResponse]:
        """
        Return all interview schedules where user_id is a registered panelist.
        Useful for a reviewer's 'My Upcoming Interviews' view.
        """
        result = await self.db.execute(
            select(InterviewSchedule)
            .join(
                InterviewPanelist,
                InterviewPanelist.schedule_id == InterviewSchedule.id,
            )
            .where(InterviewPanelist.user_id == user_id)
            .options(
                selectinload(InterviewSchedule.panelists).selectinload(
                    InterviewPanelist.user
                ),
                selectinload(InterviewSchedule.feedback_entries).selectinload(
                    InterviewFeedback.panelist
                ),
            )
            .order_by(InterviewSchedule.scheduled_at.asc())
        )
        schedules = result.scalars().all()
        return [self._build_response(s) for s in schedules]

    # ──────────────────────────────────────────────────
    #  Validation helpers
    # ──────────────────────────────────────────────────

    async def _validate_panelist_users(self, user_ids: List[int]) -> None:
        """Ensure all panelist user IDs correspond to existing admin/reviewer users."""
        if not user_ids:
            return
        result = await self.db.execute(
            select(User).where(User.id.in_(user_ids))
        )
        found_users = {u.id: u for u in result.scalars().all()}

        missing = set(user_ids) - set(found_users.keys())
        if missing:
            raise ValueError(f"User ID(s) not found: {sorted(missing)}")

        non_hr = [
            uid
            for uid, u in found_users.items()
            if u.role not in (UserRole.ADMIN, UserRole.REVIEWER)
        ]
        if non_hr:
            raise ValueError(
                f"User ID(s) {non_hr} do not have admin or reviewer role "
                "and cannot be assigned as panelists"
            )

    # ──────────────────────────────────────────────────
    #  Email notifications
    # ──────────────────────────────────────────────────

    async def _send_candidate_schedule_email(
        self, application: Application, schedule: InterviewSchedule
    ) -> None:
        """
        Fire-and-forget email to the candidate with the interview details.
        Failures are logged but never raise — they must never block the API response.
        """
        try:
            from src.api.services.email_service import send_email

            candidate = application.candidate
            job = application.job
            job_title = job.title if job else "the position"
            candidate_name = candidate.full_name or "Candidate"

            # Format scheduled_at nicely
            dt = schedule.scheduled_at
            try:
                if dt.tzinfo:
                    from datetime import timezone as _tz
                    dt_str = dt.astimezone(_tz.utc).strftime("%A, %d %B %Y at %H:%M UTC")
                else:
                    dt_str = dt.strftime("%A, %d %B %Y at %H:%M")
            except Exception:
                dt_str = str(dt)

            duration_text = f"{schedule.duration_minutes} minutes"
            location_text = schedule.location or "To be confirmed"
            meeting_link_html = (
                f'<a href="{schedule.meeting_link}" style="color:#2b6cb0;">'
                f'Join Meeting</a>'
                if schedule.meeting_link
                else "—"
            )

            html = f"""
            <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;
                        margin:auto;padding:30px;border:1px solid #e2e8f0;border-radius:12px;
                        color:#2d3748;line-height:1.7;">
                <div style="text-align:center;margin-bottom:28px;">
                    <h1 style="color:#2b6cb0;font-size:24px;margin:0;">Interview Scheduled</h1>
                </div>
                <p>Dear <strong>{candidate_name}</strong>,</p>
                <p>We are pleased to confirm your interview for the
                   <strong>{job_title}</strong> position.</p>

                <div style="background:#f7fafc;padding:20px;border-radius:8px;
                            margin:24px 0;border-left:5px solid #2b6cb0;">
                    <h3 style="margin-top:0;color:#2d3748;font-size:16px;">Interview Details</h3>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:6px 0;color:#4a5568;width:40%;"><strong>Date &amp; Time:</strong></td>
                            <td>{dt_str}</td>
                        </tr>
                        <tr>
                            <td style="padding:6px 0;color:#4a5568;"><strong>Duration:</strong></td>
                            <td>{duration_text}</td>
                        </tr>
                        <tr>
                            <td style="padding:6px 0;color:#4a5568;"><strong>Location:</strong></td>
                            <td>{location_text}</td>
                        </tr>
                        <tr>
                            <td style="padding:6px 0;color:#4a5568;"><strong>Meeting Link:</strong></td>
                            <td>{meeting_link_html}</td>
                        </tr>
                    </table>
                </div>

                <p>Please ensure you are available at the scheduled time.
                   If you need to reschedule, contact our HR team as soon as possible.</p>
                <p style="margin-top:30px;">Best regards,<br/>
                   <strong style="color:#2b6cb0;">The Hiring Team</strong><br/>
                   Evalyn AI</p>
                <hr style="border:0;border-top:1px solid #edf2f7;margin:30px 0;"/>
                <p style="font-size:12px;color:#a0aec0;text-align:center;">
                    This email was sent regarding your application for
                    <strong>{job_title}</strong>.
                </p>
            </div>
            """

            subject = f"Interview Scheduled – {job_title}"
            await send_email(candidate.email, subject, html)
            logger.info(
                "Interview schedule notification sent to %s for application %s",
                candidate.email,
                application.id,
            )
        except Exception as exc:
            logger.error(
                "Failed to send interview schedule email for application %s: %s",
                application.id,
                exc,
            )
