from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.core.dependencies import get_current_user, get_current_admin_or_reviewer
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

@router.get("/", response_model=list[OnboardingResponse])
async def get_all_onboardings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_reviewer)
):
    """
    Get all onboarding records for HR/IT dashboard.
    """
    service = OnboardingService(db)
    return await service.get_all_onboardings()

@router.get("/{application_id}", response_model=OnboardingResponse)
async def get_onboarding(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get onboarding status for a specific application.
    """
    service = OnboardingService(db)
    onboarding = await service.get_by_application(application_id)
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found for this application")
        
    # Check authorization
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER] and current_user.id != onboarding.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this onboarding record")
        
    return onboarding

@router.put("/{application_id}/candidate-date", response_model=OnboardingResponse)
async def update_candidate_date(
    application_id: int,
    data: CandidateOnboardingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Candidate provides joining date.
    """
    service = OnboardingService(db)
    return await service.update_candidate_joining_date(application_id, current_user.id, data)

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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Candidate uploads requested documents.
    """
    service = OnboardingService(db)
    return await service.update_candidate_documents(application_id, current_user.id, data)

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
