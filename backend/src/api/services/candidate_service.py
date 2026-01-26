from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.api.models.candidate import CandidateProfile
from src.api.schemas.candidate import CandidateProfileCreate

class CandidateService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_profile(self, user_id: int, profile_in: CandidateProfileCreate) -> CandidateProfile:
        """Create a new candidate profile."""
        profile = CandidateProfile(
            user_id=user_id,
            resume_url=profile_in.resume_url,
            linkedin_url=profile_in.linkedin_url,
            portfolio_url=profile_in.portfolio_url,
            skills=profile_in.skills,
            experience_years=profile_in.experience_years,
            bio=profile_in.bio
        )
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def get_profile_by_user_id(self, user_id: int) -> CandidateProfile | None:
        """Get candidate profile by user ID."""
        result = await self.db.execute(select(CandidateProfile).where(CandidateProfile.user_id == user_id))
        return result.scalars().first()
