from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.core.dependencies import get_current_user, get_current_admin_or_reviewer, get_optional_user
from src.api.models.user import User, UserRole
from src.api.schemas.onboarding import (
    OnboardingResponse,
    CandidateOnboardingUpdate,
    HRJoiningDetailsUpdate,
    CandidateDocumentUpload,
    HROnboardingVerify,
    ITOnboardingUpdate,
    HRInductionUpdate,
    ITInductionUpdate,
    ManagerInductionUpdate
)
from src.api.services.onboarding_service import OnboardingService

router = APIRouter()

@router.post("/{application_id}", response_model=OnboardingResponse, status_code=status.HTTP_201_CREATED)
async def initiate_onboarding(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_reviewer)
):
    """
    Trigger onboarding for an application. Requires Admin/Reviewer role.
    """
    service = OnboardingService(db)
    return await service.initiate_onboarding(application_id)

@router.get("", response_model=list[OnboardingResponse])
async def get_all_onboardings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_reviewer)
):
    """
    Get all onboarding records for HR/IT dashboard.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"GET /onboarding/ called by user {current_user.email}")
    service = OnboardingService(db)
    result = await service.get_all_onboardings()
    logger.info(f"GET /onboarding/ returning {len(result)} records")
    return result

@router.get("/hr/{application_id}")
async def get_hr_onboarding_view(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_reviewer)
):
    """
    HR view of candidate onboarding documents and status.
    """
    service = OnboardingService(db)
    return await service.get_hr_onboarding_details(application_id)

@router.get("/{application_id}", response_model=OnboardingResponse)
async def get_onboarding(
    application_id: int,
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    """
    Get onboarding status for a specific application.
    """
    service = OnboardingService(db)
    onboarding = await service.get_by_application(application_id)
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found for this application")
        
    # Check authorization using service layer
    await service._check_auth(onboarding, current_user, token)
        
    # Return as dict to avoid any serialization issues with lazy relationships
    # Use the same logic as get_all_onboardings but for a single object
    # For simplicity, we can reuse the schema validation here since we are not loading nested relationships
    return OnboardingResponse.model_validate(onboarding)

@router.put("/{application_id}/candidate-date", response_model=OnboardingResponse)
async def update_candidate_date(
    application_id: int,
    data: CandidateOnboardingUpdate,
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    """
    Candidate provides joining date.
    """
    service = OnboardingService(db)
    return await service.update_candidate_joining_date(application_id, current_user, data, token)

@router.put("/{application_id}/hr-joining-details", response_model=OnboardingResponse)
async def hr_set_joining_details(
    application_id: int,
    data: HRJoiningDetailsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_reviewer)
):
    """
    HR provides reporting time, office location, shift timing.
    """
    service = OnboardingService(db)
    return await service.hr_set_joining_details(application_id, data)

@router.put("/{application_id}/candidate-docs", response_model=OnboardingResponse)
async def update_candidate_docs(
    application_id: int,
    data: CandidateDocumentUpload,
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    """
    Candidate uploads requested documents.
    """
    service = OnboardingService(db)
    return await service.update_candidate_documents(application_id, current_user, data, token)

@router.post("/{application_id}/upload-documents", response_model=OnboardingResponse)
async def upload_documents(
    application_id: int,
    cnic: Optional[UploadFile] = File(None),
    resume: Optional[UploadFile] = File(None),
    degree: Optional[UploadFile] = File(None),
    front_picture: Optional[UploadFile] = File(None),
    salary_slip: Optional[UploadFile] = File(None),
    experience_letter: Optional[UploadFile] = File(None),
    police_clearance: Optional[UploadFile] = File(None),
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    """
    Candidate uploads multiple documents via multipart/form-data.
    """
    service = OnboardingService(db)
    return await service.upload_onboarding_documents(
        application_id=application_id,
        current_user=current_user,
        cnic=cnic,
        resume=resume,
        degree=degree,
        front_picture=front_picture,
        salary_slip=salary_slip,
        experience_letter=experience_letter,
        police_clearance=police_clearance,
        token=token
    )

@router.put("/{application_id}/hr-verify", response_model=OnboardingResponse)
async def hr_verify(
    application_id: int,
    data: HROnboardingVerify,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_reviewer)
):
    """
    HR verifies candidate documents.
    """
    service = OnboardingService(db)
    return await service.hr_verify(application_id, data)

@router.put("/{application_id}/it-setup", response_model=OnboardingResponse)
async def it_setup(
    application_id: int,
    data: ITOnboardingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_reviewer)
):
    """
    IT ticks off checklist items.
    """
    service = OnboardingService(db)
    return await service.it_setup_update(application_id, data)

@router.put("/{application_id}/induction/hr", response_model=OnboardingResponse)
async def induction_hr_update(
    application_id: int,
    data: HRInductionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_reviewer)
):
    """
    HR updates Day 1 Induction checklist.
    """
    service = OnboardingService(db)
    return await service.hr_induction_update(application_id, data)

@router.put("/{application_id}/induction/it", response_model=OnboardingResponse)
async def induction_it_update(
    application_id: int,
    data: ITInductionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_reviewer)
):
    """
    IT updates Day 1 Induction checklist.
    """
    service = OnboardingService(db)
    return await service.it_induction_update(application_id, data)

@router.put("/{application_id}/induction/manager", response_model=OnboardingResponse)
async def induction_manager_update(
    application_id: int,
    data: ManagerInductionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_reviewer)
):
    """
    Manager updates Day 1 Induction checklist.
    """
    service = OnboardingService(db)
    return await service.manager_induction_update(application_id, data)

@router.post("/{application_id}/send-welcome-email")
async def send_welcome_email(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_reviewer)
):
    """
    Send welcome email to candidate with onboarding link.
    """
    service = OnboardingService(db)
    success = await service.send_welcome_email(application_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email")
    return {"message": "Onboarding email sent successfully"}
