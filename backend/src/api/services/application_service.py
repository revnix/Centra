from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from src.api.models.application import Application, ApplicationStatus
from src.api.models.candidate import CandidateProfile
from src.api.models.user import User, UserRole

class ApplicationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_application(self, user_id: int, job_id: int) -> Application:
        """Create a new application for a candidate."""
        # Check if already applied
        existing = await self.get_application_by_user_and_job(user_id, job_id)
        if existing:
            return existing

        application = Application(
            candidate_id=user_id,
            job_id=job_id,
            status=ApplicationStatus.APPLIED
        )
        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)
        return application

    async def get_application_by_user_and_job(self, user_id: int, job_id: int) -> Application | None:
        """Check if user has already applied for this job."""
        result = await self.db.execute(
            select(Application)
            .where(Application.candidate_id == user_id)
            .where(Application.job_id == job_id)
        )
        return result.scalars().first()

    async def get_application_by_id(self, application_id: int) -> Application | None:
        """Get application by ID with related data loaded."""
        result = await self.db.execute(
            select(Application)
            .options(
                selectinload(Application.candidate).selectinload(User.candidate_profile),
                selectinload(Application.job)
            )
            .where(Application.id == application_id)
        )
        return result.scalars().first()
