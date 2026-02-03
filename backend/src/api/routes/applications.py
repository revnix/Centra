from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
import os
import uuid
import json
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.core.dependencies import get_current_user
from src.api.models.user import User, UserRole
from src.api.services.application_service import ApplicationService
from src.api.services.interview_service import InterviewService
from src.api.services.auth_service import AuthService
from src.api.services.candidate_service import CandidateService
from src.api.schemas.application import ApplicationCreate, ApplicationResponse
from src.api.schemas.user import UserCreate
from src.api.schemas.candidate import CandidateProfileCreate
from src.api.core.config import settings

router = APIRouter()

@router.post("/guest", response_model=dict, status_code=status.HTTP_201_CREATED)
async def guest_apply(
    job_id: int = Form(...),
    email: str = Form(...),
    full_name: str = Form(...),
    phone_number: Optional[str] = Form(None),
    linkedin_url: Optional[str] = Form(None),
    skills: str = Form("[]"),
    experience_years: int = Form(0),
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
    elif resume_url:
        # Update resume URL if new one uploaded
        profile.resume_url = resume_url
        db.add(profile)
        await db.commit()
        
    # 4. Create Application
    application = await app_service.create_application(
        user.id, 
        job_id,
        phone_number=phone_number
    )
    
    # 5. Generate Interview Token
    session = await int_service.create_session(application.id)
    
    return {
        "message": "Application submitted successfully",
        "redirect_url": f"/portal/interview/{session.token}",
        "interview_token": session.token
    }

@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def apply(
    apply_data: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Authenticated user application."""
    app_service = ApplicationService(db)
    application = await app_service.create_application(current_user.id, apply_data.job_id)
    return application
