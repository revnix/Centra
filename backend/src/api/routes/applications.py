import json
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload, noload
from sqlalchemy.sql import func

from src.api.core.dependencies import get_current_user
from src.api.db.session import get_db, AsyncSessionLocal
from src.api.models.application import Application, ApplicationStatus
from src.api.models.user import User, UserRole
from src.api.schemas.application import ApplicationCreate, ApplicationResponse
from src.api.schemas.candidate import CandidateProfileCreate
from src.api.schemas.user import UserCreate
from src.api.services.application_service import ApplicationService
from src.api.services.auth_service import AuthService
from src.api.services.candidate_service import CandidateService
from src.api.services.email_service import send_email
from src.api.services.screening_service import ScreeningService

router = APIRouter()


async def run_screening(application_id: int):
    """Background task to run AI screening."""
    async with AsyncSessionLocal() as db:
        service = ScreeningService(db)
        await service.evaluate_and_invite(application_id)


@router.post("/guest", response_model=dict, status_code=status.HTTP_201_CREATED)
async def guest_apply(
    background_tasks: BackgroundTasks,
    job_id: int = Form(...),
    email: str = Form(...),
    full_name: str = Form(...),
    phone_number: Optional[str] = Form(None),
    linkedin_url: Optional[str] = Form(None),
    skills: str = Form("[]"),
    experience_years: int = Form(0),
    cover_letter: Optional[str] = Form(None),
    expected_salary: Optional[str] = Form(None),
    city: str = Form(...),
    qualification: str = Form(...),
    resume_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Guest Application Flow:
    1. Handle Resume File Upload
    2. Check if user exists (or create shadow user)
    3. Create/Update Profile
    4. Create Application
    5. Trigger AI Screening
    """
    auth_service = AuthService(db)
    app_service = ApplicationService(db)
    cand_service = CandidateService(db)

    resume_url = None
    if resume_file:
        from src.api.utils.cloudinary_upload import upload_file
        content = await resume_file.read()
        safe_email = email.replace('@', '_at_').replace('+', '_')
        resume_url = await upload_file(
            content,
            resume_file.filename,
            folder=f"evalyn/resumes/{safe_email}",
        )

    try:
        skills_list = json.loads(skills)
    except (json.JSONDecodeError, ValueError):
        skills_list = []

    user = await auth_service.get_user_by_email(email)
    if not user:
        import secrets
        user_in = UserCreate(
            email=email,
            password=secrets.token_urlsafe(16),
            full_name=full_name,
            role=UserRole.CANDIDATE,
        )
        user = await auth_service.create_user(user_in)

    profile = await cand_service.get_profile_by_user_id(user.id)
    if not profile:
        profile_in = CandidateProfileCreate(
            resume_url=resume_url,
            linkedin_url=linkedin_url,
            skills=skills_list,
            experience_years=experience_years,
        )
        await cand_service.create_profile(user.id, profile_in)
    else:
        if resume_url:
            profile.resume_url = resume_url
        if linkedin_url:
            profile.linkedin_url = linkedin_url
        if skills_list:
            profile.skills = skills_list
        if experience_years > 0:
            profile.experience_years = experience_years
        db.add(profile)

    application = await app_service.create_application(
        user.id,
        job_id,
        phone_number=phone_number,
        cover_letter=cover_letter,
        source="guest_web",
        background_tasks=background_tasks,
        expected_salary=expected_salary,
        city=city,
        qualification=qualification,
    )

    background_tasks.add_task(run_screening, application.id)

    return {
        "message": "Application submitted successfully. Our AI system will review your profile and send an interview invitation via email if you are shortlisted.",
        "status": "review_pending",
    }


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def apply(
    apply_data: ApplicationCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    app_service = ApplicationService(db)
    application = await app_service.create_application(
        current_user.id,
        apply_data.job_id,
        cover_letter=apply_data.cover_letter,
        phone_number=apply_data.phone_number,
        source=apply_data.source or "web",
        background_tasks=background_tasks,
        expected_salary=apply_data.expected_salary,
        city=apply_data.city,
        qualification=apply_data.qualification,
    )
    background_tasks.add_task(run_screening, application.id)
    return application


@router.get("/me", response_model=List[ApplicationResponse])
async def list_my_applications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    app_service = ApplicationService(db)
    return await app_service.get_applications_by_user_id(current_user.id)


@router.get("/by-job/{job_id}", response_model=List[ApplicationResponse])
async def list_applications_by_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Application)
        .where(Application.job_id == job_id)
        .options(
            joinedload(Application.candidate),
            joinedload(Application.job),
            noload(Application.interview_session),  # avoids MissingGreenlet on serialization
        )
        .order_by(Application.match_score.desc().nullslast())
    )
    return result.scalars().all()


@router.get("", response_model=List[ApplicationResponse])
async def list_applications(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    app_service = ApplicationService(db)
    return await app_service.list_applications(skip, limit)


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    app_service = ApplicationService(db)
    application = await app_service.get_application_by_id(application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@router.post("/{application_id}/hire", response_model=ApplicationResponse)
async def hire_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    app_service = ApplicationService(db)
    try:
        return await app_service.hire_candidate(application_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{application_id}/reject", response_model=ApplicationResponse)
async def reject_application_route(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    app_service = ApplicationService(db)
    try:
        return await app_service.reject_application(application_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(status_code=403, detail="Not authorized to delete applications")

    app_service = ApplicationService(db)
    success = await app_service.delete_application(application_id)
    if not success:
        raise HTTPException(status_code=404, detail="Application not found")
    return None


@router.post("/{application_id}/analyze", response_model=ApplicationResponse)
async def analyze_application_route(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    app_service = ApplicationService(db)
    try:
        return await app_service.analyze_application(application_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{application_id}/shortlist", response_model=ApplicationResponse)
async def shortlist_application_route(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(status_code=403, detail="Not authorized")

    app_service = ApplicationService(db)
    try:
        return await app_service.shortlist_candidate(application_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{application_id}/invite")
async def send_interview_invite(
    application_id: int,
    subject: str = Form(...),
    message: str = Form(...),
    attachments: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """HR manually sends a custom interview invitation email to the candidate, with optional file attachments."""
    result = await db.execute(
        select(Application)
        .options(joinedload(Application.candidate), joinedload(Application.job))
        .where(Application.id == application_id)
    )
    application = result.scalars().first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    candidate = application.candidate
    job = application.job

    # Process file attachments
    email_attachments = []
    for f in (attachments or []):
        content = await f.read()
        email_attachments.append({"filename": f.filename, "content": list(content)})

    html_body = f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px;
                margin: auto; padding: 30px; border: 1px solid #e2e8f0;
                border-radius: 12px; color: #2d3748; line-height: 1.7;">
        <div style="text-align: center; margin-bottom: 28px;">
            <h1 style="color: #2b6cb0; font-size: 24px; margin: 0;">Interview Invitation</h1>
        </div>
        <p>Dear <strong>{candidate.full_name or 'Candidate'}</strong>,</p>
        <div style="white-space: pre-wrap; margin: 20px 0;">{message}</div>
        <p style="margin-top: 30px;">Best regards,<br/>
        <strong style="color: #2b6cb0;">The Hiring Team</strong><br/>
        Evalyn AI</p>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center;">
            This email was sent regarding your application for
            <strong>{job.title if job else 'our open position'}</strong>.
        </p>
    </div>
    """

    sent = await send_email(candidate.email, subject, html_body, attachments=email_attachments if email_attachments else None)

    if sent:
        application.email_delivery_status = "SENT"
        application.status = ApplicationStatus.SENT
        application.interview_invitation_status = "SENT"
        application.last_interview_invite_id = sent
        application.interview_invite_sent_at = func.now()
        attach_note = f" | {len(email_attachments)} attachment(s)" if email_attachments else ""
        application.email_logs = f"Manual invite sent by HR. Subject: {subject}{attach_note}"
    else:
        application.email_delivery_status = "FAILED"
        application.interview_invitation_status = "FAILED"
        application.email_logs = f"Manual invite failed. Subject: {subject}"

    db.add(application)
    await db.commit()

    if not sent:
        raise HTTPException(status_code=500, detail="Email delivery failed. Please try again.")

    return {
        "success": True,
        "message": f"Interview invitation sent to {candidate.email}",
        "status": application.status,
    }


class UpdateStatusRequest(BaseModel):
    status: str


@router.patch("/{application_id}/status", response_model=ApplicationResponse)
async def update_application_status(
    application_id: int,
    body: UpdateStatusRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Move an application to any pipeline stage."""
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        new_status = ApplicationStatus(body.status.upper())
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid status: {body.status}")

    result = await db.execute(
        select(Application)
        .options(
            joinedload(Application.candidate),
            joinedload(Application.job),
            joinedload(Application.interview_session)
        )
        .where(Application.id == application_id)
    )
    application = result.scalars().first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    application.status = new_status

    # Sync with interview tracking status
    if new_status == ApplicationStatus.INTERVIEW_SCHEDULED:
        if application.interview_invitation_status not in ["ACCEPTED", "DECLINED"]:
            application.interview_invitation_status = "ACCEPTED"
            application.email_logs = "Application status moved to INTERVIEW_SCHEDULED."

    db.add(application)
    await db.commit()
    await db.refresh(application)
    return application


@router.post("/{application_id}/reset-email-status", response_model=ApplicationResponse)
async def reset_email_status(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reset email tracking so HR can resend any email for this application."""
    result = await db.execute(
        select(Application)
        .options(
            joinedload(Application.candidate),
            joinedload(Application.job),
            noload(Application.interview_session),
        )
        .where(Application.id == application_id)
    )
    application = result.scalars().first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    application.email_delivery_status = "PENDING"
    application.interview_invitation_status = "NOT_SENT"
    application.last_interview_invite_id = None
    application.interview_invite_sent_at = None
    application.email_logs = None

    # Reset status so email buttons become active again
    if application.status == ApplicationStatus.HIRED:
        application.status = ApplicationStatus.RESPONDED  # type: ignore[assignment]
    elif application.status == ApplicationStatus.REJECTED:
        application.status = ApplicationStatus.SHORTLISTED  # type: ignore[assignment]

    db.add(application)
    await db.commit()
    await db.refresh(application)
    return application

