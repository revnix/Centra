import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.future import select
import src.app.db.all_models  # noqa: F401 - registers all models before mapper configuration
from src.app.db.session import AsyncSessionLocal
from src.app.modules.platform.users.models.user import User, UserRole
from src.app.modules.recruiting.models.job import Posts, JobStatus, JobType, ExperienceLevel
from src.app.modules.recruiting.models.candidate import CandidateProfile
from src.app.modules.recruiting.models.application import Application, ApplicationStatus
from src.app.modules.recruiting.models.interview import InterviewSession, InterviewStatus
from src.app.modules.recruiting.models.onboarding import Onboarding, OnboardingStatus
from src.app.core.security import get_password_hash

async def seed_all():
    async with AsyncSessionLocal() as db:
        print("Starting comprehensive database seeding...")

        # 1. Seed Users (Admin, HR, Finance, Leads, Candidate)
        import os
        default_password = os.getenv("SEED_DEFAULT_PASSWORD", "secret")
        hashed_password = get_password_hash(default_password)
        
        # Check for existing admin
        result = await db.execute(select(User).where(User.username == "admin"))
        admin = result.scalars().first()
        if not admin:
            admin = User(
                email="admin@centra.com",
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

        # Seed HR/Finance/Leads as admin/reviewer users for now (fine-grained ERP roles will be RBAC)
        extra_users = [
            {"username": "org_admin", "email": "org.admin@centra.com", "full_name": "Org Admin", "role": UserRole.ADMIN},
            {"username": "hr_admin", "email": "hr.admin@centra.com", "full_name": "HR Admin", "role": UserRole.ADMIN},
            {"username": "finance_admin", "email": "finance.admin@centra.com", "full_name": "Finance Admin", "role": UserRole.ADMIN},
            {"username": "lead_ai", "email": "lead.ai@centra.com", "full_name": "AI Lead", "role": UserRole.REVIEWER},
            {"username": "lead_web", "email": "lead.web@centra.com", "full_name": "Web Lead", "role": UserRole.REVIEWER},
            {"username": "lead_shopify", "email": "lead.shopify@centra.com", "full_name": "Shopify Lead", "role": UserRole.REVIEWER},
            {"username": "lead_uiux", "email": "lead.uiux@centra.com", "full_name": "UI/UX Lead", "role": UserRole.REVIEWER},
        ]

        for u in extra_users:
            res = await db.execute(select(User).where(User.username == u["username"]))
            existing = res.scalars().first()
            if existing:
                continue
            db.add(User(
                email=u["email"],
                username=u["username"],
                full_name=u["full_name"],
                hashed_password=hashed_password,
                role=u["role"],
                is_active=True
            ))
            print(f"Added user: {u['username']} ({u['email']})")

        await db.commit()

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
                short_description='Lead LLM integration efforts at Centra.',
                company_name='Centra AI',
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
            
            # Integrated Centralized Handler (Automation Agent / Script Example)
            from src.app.modules.platform.files.utils.application_handler import handle_new_application
            await handle_new_application(db, application.id)

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

        # 6. Seed Onboarding
        result = await db.execute(select(Onboarding).where(Onboarding.application_id == application.id))
        onboarding = result.scalars().first()
        if not onboarding:
            onboarding = Onboarding(
                application_id=application.id,
                user_id=candidate_user.id,
                onboarding_token=str(uuid.uuid4()),
                status=OnboardingStatus.PENDING_CANDIDATE_JOINING
            )
            db.add(onboarding)
            print("Added sample onboarding process.")

        await db.commit()
        print("Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_all())
