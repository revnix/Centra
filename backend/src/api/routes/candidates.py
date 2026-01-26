from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.core.dependencies import get_current_user
from src.api.models.user import User
from src.api.services.candidate_service import CandidateService
from src.api.schemas.candidate import CandidateProfileCreate, CandidateProfileResponse

router = APIRouter()

@router.post("/profile", response_model=CandidateProfileResponse)
async def create_or_update_profile(
    profile_in: CandidateProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create or update current user's candidate profile."""
    service = CandidateService(db)
    
    # Check existing
    existing = await service.get_profile_by_user_id(current_user.id)
    if existing:
        # Update logic would go here (simple re-creation/overwrite for MVP)
        # Ideally, implement update_profile in service
        pass 
        
    profile = await service.create_profile(current_user.id, profile_in)
    return profile

@router.get("/me", response_model=CandidateProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's profile."""
    service = CandidateService(db)
    profile = await service.get_profile_by_user_id(current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
