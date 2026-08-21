from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from src.app.core.config import settings
from src.app.core.dependencies import get_current_user
from src.app.db.session import get_db
from src.app.modules.recruiting.models.application import Application
from src.app.modules.recruiting.models.screening import ScreeningTest
from src.app.modules.platform.users.models.user import User
from src.app.modules.recruiting.services.screening_service import ScreeningService
from src.app.integrations.email.services.service import EmailService

router = APIRouter()


class SubmitAnswersRequest(BaseModel):
    answers: List[Optional[int]]
    recording_url: Optional[str] = None


class ScreeningQuestionInput(BaseModel):
    question: str = Field(..., min_length=1)
    options: List[str] = Field(..., min_length=2, max_length=6)
    correct_index: int = Field(..., ge=0)
    difficulty: str = "basic"

    @field_validator("question")
    @classmethod
    def clean_question(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Question text is required")
        return cleaned

    @field_validator("options")
    @classmethod
    def clean_options(cls, value: List[str]) -> List[str]:
        cleaned = [option.strip() for option in value if option and option.strip()]
        if len(cleaned) < 2:
            raise ValueError("Each question must have at least 2 options")
        return cleaned

    @field_validator("difficulty")
    @classmethod
    def clean_difficulty(cls, value: str) -> str:
        normalized = (value or "basic").strip().lower()
        return normalized if normalized in {"basic", "intermediate", "advanced"} else "basic"

    @model_validator(mode="after")
    def validate_correct_index(self):
        if self.correct_index >= len(self.options):
            raise ValueError("correct_index must point to one of the options")
        return self


class CreateScreeningRequest(BaseModel):
    questions: Optional[List[ScreeningQuestionInput]] = None
    raw_questions: Optional[List[str]] = None
    time_limit_minutes: int = Field(default=10, ge=1, le=180)

    @field_validator("raw_questions")
    @classmethod
    def clean_raw_questions(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return value
        cleaned = [question.strip() for question in value if question and question.strip()]
        if not cleaned:
            raise ValueError("Add at least one screening question")
        return cleaned


# ── HR endpoints (auth required) ───────────────────────────────────────────────

@router.post("/generate-questions/{application_id}")
async def generate_screening_questions(
    application_id: int,
    count: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ScreeningService(db)
    try:
        raw_questions = await service.generate_raw_questions_for_app(application_id, count=count)
        return {"questions": raw_questions}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")


@router.post("/create/{application_id}")
async def create_screening(
    application_id: int,
    request: Optional[CreateScreeningRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ScreeningService(db)
    try:
        questions = None
        raw_questions = None
        time_limit_minutes = 10
        if request:
            time_limit_minutes = request.time_limit_minutes
            if request.questions is not None:
                if len(request.questions) == 0:
                    raise HTTPException(status_code=400, detail="Add at least one screening question")
                questions = [
                    {
                        "id": index + 1,
                        "question": question.question,
                        "options": question.options,
                        "correct_index": question.correct_index,
                        "difficulty": question.difficulty,
                    }
                    for index, question in enumerate(request.questions)
                ]
            elif request.raw_questions is not None:
                raw_questions = request.raw_questions

        test = await service.create_screening_test(
            application_id,
            questions=questions,
            raw_questions=raw_questions,
            time_limit_minutes=time_limit_minutes,
        )
    except HTTPException:
        raise
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
                total_questions=test.total_questions,
            )
            email_sent = True
        except Exception:
            pass  # email failure should not block the response

    # ✅ Move the candidate into the Screening Test pipeline stage
    test_token = test.token
    test_id = test.id
    if application:
        from src.app.modules.recruiting.models.application import ApplicationStatus
        application.status = ApplicationStatus.SCREENING_TEST
        application.email_delivery_status = "SENT" if email_sent else "FAILED"
        application.email_logs = f"Screening test email sent. URL: {test_url}" if email_sent else "Email send failed."
        db.add(application)
        await db.commit()

    return {"token": test_token, "test_url": test_url, "id": test_id, "email_sent": email_sent}


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
        "correct_count": test.correct_count,
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

    needs_commit = False
    if test.status == "PENDING":
        test.status = "IN_PROGRESS"
        test.started_at = datetime.now(timezone.utc)
        db.add(test)
        needs_commit = True

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

    response_data = {
        "token": test.token,
        "status": test.status,
        "total_questions": test.total_questions,
        "time_limit_minutes": test.time_limit_minutes,
        "questions": safe_questions,
        "candidate_name": application.candidate.full_name if application else "Candidate",
        "job_title": application.job.title if application else "Position",
    }

    if needs_commit:
        await db.commit()

    return response_data


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
    service = ScreeningService(db)

    if test.status == "COMPLETED":
        breakdown = service.calculate_score_breakdown(test.questions, test.answers or [])
        return {
            "message": "Test already submitted",
            "score": test.score,
            "correct_count": breakdown["correct"],
            "total_questions": breakdown["total"],
        }

    breakdown = service.calculate_score_breakdown(test.questions, request.answers)

    test.answers = list(request.answers)
    test.score = breakdown["percentage"]
    test.status = "COMPLETED"
    test.completed_at = datetime.now(timezone.utc)
    if request.recording_url:
        test.recording_url = request.recording_url

    db.add(test)
    await db.commit()

    return {
        "message": "Test submitted successfully",
        "score": breakdown["percentage"],
        "correct_count": breakdown["correct"],
        "total_questions": breakdown["total"],
    }
