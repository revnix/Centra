from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from src.api.core.config import settings
from src.api.core.dependencies import get_current_user
from src.api.db.session import get_db
from src.api.models.application import Application
from src.api.models.screening import ScreeningTest
from src.api.models.user import User
from src.api.services.screening_service import ScreeningService
from src.api.services.email_service import EmailService

router = APIRouter()


class SubmitAnswersRequest(BaseModel):
    answers: List[Optional[int]]
    recording_url: Optional[str] = None


# ── HR endpoints (auth required) ───────────────────────────────────────────────

@router.post("/create/{application_id}")
async def create_screening(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ScreeningService(db)
    try:
        test = await service.create_screening_test(application_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate screening test: {str(e)}")

    test_url = f"{settings.FRONTEND_URL}/screening/{test.token}"

    # Fetch candidate info for email and update application status
    app_result = await db.execute(
        select(Application)
        .options(joinedload(Application.candidate), joinedload(Application.job))
        .where(Application.id == application_id)
    )
    application = app_result.scalars().first()

    email_sent = False
    if application and application.candidate and application.candidate.email:
        candidate_name = application.candidate.full_name or "Candidate"
        job_title = application.job.title if application.job else "the position"
        try:
            await EmailService.send_screening_test_email(
                candidate_email=application.candidate.email,
                candidate_name=candidate_name,
                job_title=job_title,
                test_url=test_url,
                expires_hours=72,
            )
            email_sent = True
        except Exception:
            pass  # email failure should not block the response

    # ✅ Move the candidate into the Screening Test pipeline stage
    if application:
        from src.api.models.application import ApplicationStatus
        application.status = ApplicationStatus.SCREENING_TEST
        application.email_delivery_status = "SENT" if email_sent else "FAILED"
        application.email_logs = f"Screening test email sent. URL: {test_url}" if email_sent else "Email send failed."
        db.add(application)
        await db.commit()

    return {"token": test.token, "test_url": test_url, "id": test.id, "email_sent": email_sent}


@router.get("/result/{application_id}")
async def get_result(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ScreeningTest).where(ScreeningTest.application_id == application_id)
    )
    test = result.scalars().first()
    if not test:
        raise HTTPException(status_code=404, detail="No screening test found for this application")
    return {
        "id": test.id,
        "application_id": test.application_id,
        "token": test.token,
        "questions": test.questions,
        "answers": test.answers,
        "score": test.score,
        "total_questions": test.total_questions,
        "time_limit_minutes": test.time_limit_minutes,
        "status": test.status,
        "started_at": test.started_at.isoformat() if test.started_at else None,
        "completed_at": test.completed_at.isoformat() if test.completed_at else None,
        "recording_url": test.recording_url,
        "created_at": test.created_at.isoformat() if test.created_at else None,
    }


# ── Public endpoints (no auth — candidate-facing) ─────────────────────────────

@router.get("/test/{token}")
async def get_test(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScreeningTest).where(ScreeningTest.token == token))
    test = result.scalars().first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if test.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="This test has already been submitted")
    if test.status == "EXPIRED":
        raise HTTPException(status_code=400, detail="This test link has expired")

    # Check 72-hour expiry
    if test.expires_at and datetime.now(timezone.utc) > test.expires_at:
        test.status = "EXPIRED"
        db.add(test)
        await db.commit()
        raise HTTPException(status_code=400, detail="This test link has expired (72-hour window passed)")

    if test.status == "PENDING":
        test.status = "IN_PROGRESS"
        test.started_at = datetime.now(timezone.utc)
        db.add(test)
        await db.commit()

    # Strip correct_index so the candidate cannot see answers
    safe_questions = [
        {
            "id": q.get("id", i + 1),
            "question": q["question"],
            "options": q["options"],
            "difficulty": q.get("difficulty", "basic"),
        }
        for i, q in enumerate(test.questions)
    ]

    app_result = await db.execute(
        select(Application)
        .options(joinedload(Application.candidate), joinedload(Application.job))
        .where(Application.id == test.application_id)
    )
    application = app_result.scalars().first()

    return {
        "token": test.token,
        "status": test.status,
        "total_questions": test.total_questions,
        "time_limit_minutes": test.time_limit_minutes,
        "questions": safe_questions,
        "candidate_name": application.candidate.full_name if application else "Candidate",
        "job_title": application.job.title if application else "Position",
    }


@router.post("/submit/{token}")
async def submit_test(
    token: str,
    request: SubmitAnswersRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ScreeningTest).where(ScreeningTest.token == token))
    test = result.scalars().first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if test.status == "COMPLETED":
        return {"message": "Test already submitted", "score": test.score}

    service = ScreeningService(db)
    score = service.calculate_score(test.questions, request.answers)

    test.answers = list(request.answers)
    test.score = score
    test.status = "COMPLETED"
    test.completed_at = datetime.now(timezone.utc)
    if request.recording_url:
        test.recording_url = request.recording_url

    db.add(test)
    await db.commit()

    return {"message": "Test submitted successfully", "score": score}
