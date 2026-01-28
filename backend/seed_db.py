import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.future import select
from src.api.db.session import AsyncSessionLocal
from src.api.models.user import User, UserRole
from src.api.models.job import Posts, JobStatus, JobType, ExperienceLevel
from src.api.models.candidate import CandidateProfile
from src.api.models.application import Application, ApplicationStatus
from src.api.models.interview import InterviewSession, InterviewStatus
from src.api.core.security import get_password_hash

async def seed_all():
    async with AsyncSessionLocal() as db:
        print("Starting comprehensive database seeding...")

        # 1. Seed Users (Admin and Candidate)
        hashed_password = get_password_hash("secret")
        
        # Check for existing admin
        result = await db.execute(select(User).where(User.username == "admin"))
        admin = result.scalars().first()
        if not admin:
            admin = User(
                email="admin@evalyn.com",
                username="admin",
                full_name="Admin User",
                hashed_password=hashed_password,
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            print("Added admin user.")
        else:
            print("Admin user already exists.")

        # Check for existing candidate
        result = await db.execute(select(User).where(User.username == "jdoe"))
        candidate_user = result.scalars().first()
        if not candidate_user:
            candidate_user = User(
                email="jane.doe@example.com",
                username="jdoe",
                full_name="Jane Doe",
                hashed_password=hashed_password,
                role=UserRole.CANDIDATE,
                is_active=True
            )
            db.add(candidate_user)
            print("Added candidate user.")
        else:
            print("Candidate user already exists.")

        await db.commit()
        await db.refresh(admin)
        await db.refresh(candidate_user)

        # 2. Seed Candidate Profile
        result = await db.execute(select(CandidateProfile).where(CandidateProfile.user_id == candidate_user.id))
        profile = result.scalars().first()
        if not profile:
            profile = CandidateProfile(
                user_id=candidate_user.id,
                resume_url="https://example.com/resume.pdf",
                linkedin_url="https://linkedin.com/in/janedoe",
                skills=["Python", "React", "SQL", "FastAPI"],
                experience_years=5,
                bio="Experienced full-stack developer with a passion for AI."
            )
            db.add(profile)
            print("Added candidate profile.")
        
        # 3. Seed Jobs
        result = await db.execute(select(Posts).where(Posts.title == "Senior AI Engineer"))
        job = result.scalars().first()
        if not job:
            job = Posts(
                title='Senior AI Engineer',
                description='We are looking for a talented AI Engineer to lead our LLM integration efforts.',
                short_description='Lead LLM integration efforts at Evalyn.',
                company_name='Evalyn AI',
                location='San Francisco, CA',
                job_type=JobType.FULL_TIME,
                experience_level=ExperienceLevel.MID_SENIOR,
                department='Engineering',
                status=JobStatus.PUBLISHED,
                created_by=admin.id,
                salary_min=150000,
                salary_max=220000,
                required_skills=["Python", "LangChain", "OpenAI"],
                published_at=datetime.now(timezone.utc)
            )
            db.add(job)
            print("Added sample job.")
        
        await db.commit()
        await db.refresh(job)

        # 4. Seed Application
        result = await db.execute(select(Application).where(Application.job_id == job.id, Application.candidate_id == candidate_user.id))
        application = result.scalars().first()
        if not application:
            application = Application(
                job_id=job.id,
                candidate_id=candidate_user.id,
                status=ApplicationStatus.INTERVIEW_PENDING,
                match_score=85.5,
                ai_feedback="Great match for the role based on skills and experience."
            )
            db.add(application)
            print("Added sample application.")
            await db.commit()
            await db.refresh(application)

        # 5. Seed Interview Session
        result = await db.execute(select(InterviewSession).where(InterviewSession.application_id == application.id))
        interview = result.scalars().first()
        if not interview:
            interview = InterviewSession(
                application_id=application.id,
                token=str(uuid.uuid4()),
                status=InterviewStatus.PENDING,
                expires_at=datetime.now(timezone.utc) + timedelta(days=7)
            )
            db.add(interview)
            print("Added sample interview session.")

        await db.commit()
        print("Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_all())
