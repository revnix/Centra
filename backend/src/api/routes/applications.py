from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.core.dependencies import get_current_user
from src.api.models.user import User, UserRole
from src.api.services.application_service import ApplicationService
from src.api.services.interview_service import InterviewService
from src.api.services.auth_service import AuthService
from src.api.services.candidate_service import CandidateService
from src.api.schemas.application import ApplicationCreate, GuestApplicationCreate, ApplicationResponse
from src.api.schemas.user import UserCreate
from src.api.schemas.candidate import CandidateProfileCreate

router = APIRouter()

@router.post("/guest", response_model=dict, status_code=status.HTTP_201_CREATED)
async def guest_apply(
    apply_data: GuestApplicationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Guest Application Flow:
    1. Check if user exists (or create shadow user)
    2. Create/Update Profile
    3. Create Application
    4. Generate Interview Token
    """
    auth_service = AuthService(db)
    app_service = ApplicationService(db)
    int_service = InterviewService(db)
    cand_service = CandidateService(db)
    
    # 1. User Management
    user = await auth_service.get_user_by_email(apply_data.email)
    if not user:
        # Create shadow user (password is random/placeholder since they access via token initially)
        import secrets
        random_pw = secrets.token_urlsafe(16)
        user_in = UserCreate(
            email=apply_data.email,
            password=random_pw,
            full_name=apply_data.full_name,
            role=UserRole.CANDIDATE
        )
        user = await auth_service.create_user(user_in)
    
    # 2. Candidate Profile
    profile = await cand_service.get_profile_by_user_id(user.id)
    if not profile:
        profile_in = CandidateProfileCreate(
            resume_url=apply_data.resume_url,
            linkedin_url=apply_data.linkedin_url,
            skills=apply_data.skills,
            experience_years=apply_data.experience_years
        )
        await cand_service.create_profile(user.id, profile_in)
        
    # 3. Create Application
    application = await app_service.create_application(user.id, apply_data.job_id)
    
    # 4. Generate Interview Token
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
