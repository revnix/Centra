from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, BackgroundTasks
import os
import uuid
import json
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db, AsyncSessionLocal # Use AsyncSessionLocal for background tasks
from src.api.core.dependencies import get_current_user
from src.api.models.user import User, UserRole
from src.api.services.application_service import ApplicationService
from src.api.services.interview_service import InterviewService
from src.api.services.auth_service import AuthService
from src.api.services.candidate_service import CandidateService
from src.api.services.screening_service import ScreeningService
from src.api.schemas.application import ApplicationCreate, ApplicationResponse
from src.api.schemas.user import UserCreate
from src.api.schemas.candidate import CandidateProfileCreate
from src.api.core.config import settings

router = APIRouter()

async def run_screening(application_id: int):
    """Background task to run screening."""
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
    resume_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Guest Application Flow:
    1. Handle Resume File Upload
    2. Check if user exists (or create shadow user)
    3. Create/Update Profile
    4. Create Application
    5. Generate Interview Token
    """
    auth_service = AuthService(db)
    app_service = ApplicationService(db)
    int_service = InterviewService(db)
    cand_service = CandidateService(db)

    # 1. Handle Resume Upload
    resume_url = None
    if resume_file:
        file_ext = os.path.splitext(resume_file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(settings.UPLOAD_DIR, "resumes", unique_filename)
        
        with open(file_path, "wb") as buffer:
            content = await resume_file.read()
            buffer.write(content)
        
        resume_url = f"/uploads/resumes/{unique_filename}"
    
    # Parse skills from JSON string
    try:
        skills_list = json.loads(skills)
    except:
        skills_list = []

    # 2. User Management
    user = await auth_service.get_user_by_email(email)
    if not user:
        import secrets
        random_pw = secrets.token_urlsafe(16)
        user_in = UserCreate(
            email=email,
            password=random_pw,
            full_name=full_name,
            role=UserRole.CANDIDATE
        )
        user = await auth_service.create_user(user_in)
    
    # 3. Candidate Profile
    profile = await cand_service.get_profile_by_user_id(user.id)
    if not profile:
        profile_in = CandidateProfileCreate(
            resume_url=resume_url,
            linkedin_url=linkedin_url,
            skills=skills_list,
            experience_years=experience_years
        )
        await cand_service.create_profile(user.id, profile_in)
    else:
        # Update existing profile with latest info
        if resume_url:
            profile.resume_url = resume_url
        if linkedin_url:
            profile.linkedin_url = linkedin_url
        if skills_list:
            profile.skills = skills_list
        if experience_years > 0:
            profile.experience_years = experience_years
        
        db.add(profile)
        # We don't need a separate commit here as there's one in service or end of request
        
    # 4. Create Application
    application = await app_service.create_application(
        user.id, 
        job_id,
        phone_number=phone_number,
        cover_letter=cover_letter
    )
    
    # 5. Trigger AI Screening (Background Task)
    background_tasks.add_task(run_screening, application.id)
    
    return {
        "message": "Application submitted successfully. Our AI system will review your profile and send an interview invitation via email if you are shortlisted.",
        "status": "review_pending"
    }

@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def apply(
    apply_data: ApplicationCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Authenticated user application."""
    app_service = ApplicationService(db)
    application = await app_service.create_application(current_user.id, apply_data.job_id)
    
    # Trigger AI Screening
    background_tasks.add_task(run_screening, application.id)
    
    return application

@router.get("", response_model=List[ApplicationResponse])
async def list_applications(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all applications (Admin only)."""
    # In a real app, restrict this to Admin/Recruiter roles
    # if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
    #     raise HTTPException(status_code=403, detail="Not authorized")
    
    app_service = ApplicationService(db)
    # We need to implement a list method in service
    applications = await app_service.list_applications(skip, limit)
    return applications
@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed application by ID."""
    app_service = ApplicationService(db)
    application = await app_service.get_application_by_id(application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application

@router.post("/{application_id}/hire", response_model=ApplicationResponse)
async def hire_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Hire a candidate and send offer letter."""
    app_service = ApplicationService(db)
    try:
        application = await app_service.hire_candidate(application_id)
        return application
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{application_id}/reject", response_model=ApplicationResponse)
async def reject_application_route(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reject an application."""
    app_service = ApplicationService(db)
    try:
        application = await app_service.reject_application(application_id)
        return application
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Permanently delete an application."""
    # Restrict to Admin/Reviewer roles
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(status_code=403, detail="Not authorized to delete applications")
        
    app_service = ApplicationService(db)
    success = await app_service.delete_application(application_id)
    if not success:
        raise HTTPException(status_code=404, detail="Application not found")
    return None
