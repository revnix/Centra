from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from src.api.models.application import Application, ApplicationStatus
from src.api.models.candidate import CandidateProfile
from src.api.models.user import User, UserRole

class ApplicationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_application(
        self, 
        user_id: int, 
        job_id: int, 
        cover_letter: str = None, 
        phone_number: str = None
    ) -> Application:
        """Create a new application for a candidate."""
        # Check if already applied
        existing = await self.get_application_by_user_and_job(user_id, job_id)
        if existing:
            return existing

        application = Application(
            candidate_id=user_id,
            job_id=job_id,
            status=ApplicationStatus.APPLIED,
            cover_letter=cover_letter,
            phone_number=phone_number
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
                selectinload(Application.job),
                selectinload(Application.interview_session)
            )
            .where(Application.id == application_id)
        )
        return result.scalars().first()

    async def list_applications(self, skip: int = 0, limit: int = 100) -> list[Application]:
        """List all applications with related data."""
        result = await self.db.execute(
            select(Application)
            .options(
                selectinload(Application.candidate).selectinload(User.candidate_profile),
                selectinload(Application.job),
                selectinload(Application.interview_session)
            )
            .offset(skip)
            .limit(limit)
            .order_by(Application.created_at.desc())
        )
        return result.scalars().all()

    async def reject_application(self, application_id: int) -> Application:
        """Reject an application."""
        application = await self.get_application_by_id(application_id)
        if not application:
            raise ValueError("Application not found")
        
        application.status = ApplicationStatus.REJECTED
        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)
        return application

    async def hire_candidate(self, application_id: int) -> Application:
        """Hire a candidate and send offer letter."""
        application = await self.get_application_by_id(application_id)
        if not application:
            raise ValueError("Application not found")
        
        application.status = ApplicationStatus.HIRED
        
        # Prepare Offer Details
        candidate = application.candidate
        job = application.job
        
        salary_str = job.get_formatted_salary() or "Negotiable"
        from datetime import datetime, timedelta
        joining_date = (datetime.now() + timedelta(days=14)).strftime("%B %d, %Y")
        
        # Trigger Email
        from src.api.services.email_service import EmailService
        EmailService.send_offer_letter(
            candidate_email=candidate.email,
            candidate_name=candidate.full_name,
            job_title=job.title,
            company_name=job.company_name or "Evalyn AI",
            salary=salary_str,
            joining_date=joining_date
        )
        
        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)
        return application
