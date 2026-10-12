from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from src.app.db.session import get_db
from src.app.core.dependencies import get_current_user
from src.app.modules.platform.users.models.user import User
from src.app.modules.recruiting.services.candidate_service import CandidateService
from src.app.modules.recruiting.schemas.candidate import CandidateProfileCreate, CandidateProfileResponse
from src.app.modules.recruiting.schemas.resume_pooling import ResumePoolingQuery, ResumePoolingResponse

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

@router.post("/resume-pooling", response_model=ResumePoolingResponse)
async def pool_candidates(
    query: ResumePoolingQuery,
    db: AsyncSession = Depends(get_db)
):
    """
    Resume Pooling Endpoint for HR:
    Search, filter, and score candidates in the database based on:
    - Skills (e.g. ['Python', 'FastAPI'])
    - Job Description / Requirements
    - Education / Qualification (e.g. 'Bachelor')
    - Experience Years (e.g. 2)
    - Area of Living / City (e.g. 'Haripur')
    - Timeframe (e.g. candidates who applied within last 30, 90, or 365 days)
    
    Returns top matching candidates sorted by match score. Default limit is 15.
    """
    service = CandidateService(db)
    return await service.search_resume_pool(query)
