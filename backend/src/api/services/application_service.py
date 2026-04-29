import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from src.api.models.application import Application, ApplicationStatus
from src.api.models.candidate import CandidateProfile
from src.api.models.user import User, UserRole

logger = logging.getLogger(__name__)

class ApplicationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_application(
        self,
        user_id: int,
        job_id: int,
        cover_letter: str = None,
        phone_number: str = None,
        source: str = "web",
        background_tasks = None,
        expected_salary: float = None,
        city: str = None,
        qualification: str = None,
    ) -> Application:
        """Create a new application and trigger HR notification."""
        # Check if already applied
        existing = await self.get_application_by_user_and_job(user_id, job_id)
        if existing:
            return existing

        application = Application(
            candidate_id=user_id,
            job_id=job_id,
            status=ApplicationStatus.APPLIED,
            cover_letter=cover_letter,
            phone_number=phone_number,
            source=source,
            expected_salary=expected_salary,
            city=city.strip().lower() if city else None,
            qualification=qualification.strip() if qualification else None,
        )
        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)
        
        from src.api.services.email_service import logger
        logger.info(f"✅ Application {application.id} SAVED successfully to DB for Candidate {user_id}")
        
        # Centralized Notification Trigger
        await self._trigger_new_app_notification(application, background_tasks)
        
        return application

    async def _trigger_new_app_notification(self, application: Application, background_tasks = None):
        """Delegates notification to the centralized handler."""
        from src.api.utils.application_handler import handle_new_application
        await handle_new_application(self.db, application.id, background_tasks)




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
                joinedload(Application.candidate).joinedload(User.candidate_profile),
                joinedload(Application.job),
                joinedload(Application.interview_session)
            )
            .where(Application.id == application_id)
        )
        return result.scalars().first()

    async def list_applications(self, skip: int = 0, limit: int = 100) -> list[Application]:
        """List all applications with related data."""
        result = await self.db.execute(
            select(Application)
            .options(
                joinedload(Application.candidate).joinedload(User.candidate_profile),
                joinedload(Application.job),
                joinedload(Application.interview_session)
            )
            .offset(skip)
            .limit(limit)
            .order_by(Application.created_at.desc())
        )
        return result.scalars().all()

    async def get_applications_by_user_id(self, user_id: int) -> list[Application]:
        """Get all applications for a specific candidate."""
        result = await self.db.execute(
            select(Application)
            .options(
                joinedload(Application.job),
                joinedload(Application.interview_session)
            )
            .where(Application.candidate_id == user_id)
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

    async def analyze_application(self, application_id: int) -> Application:
        """
        Analyze a candidate's application (resume/skills) and update score/status.
        This simulates an AI step. In a real scenario, this would call an LLM.
        """
        application = await self.get_application_by_id(application_id)
        if not application:
            raise ValueError("Application not found")
            
        candidate = application.candidate
        profile = getattr(candidate, 'candidate_profile', None)
        
        # --- HARIPUR CITY FILTER ---
        # If city is not Haripur, reject immediately
        if not application.city or application.city.lower() != "haripur":
            application.status = ApplicationStatus.REJECTED
            application.match_score = 0
            application.ai_feedback = "Filtered out: Location not Haripur"
            application.email_delivery_status = "SKIPPED"
            application.email_logs = f"Candidate not from Haripur (City: {application.city})"
            self.db.add(application)
            await self.db.commit()
            await self.db.refresh(application)
            return application
        
        # Simple scoring simulation
        score = 0
        feedback = []
        
        # ATS-Based Weighted Scoring (0-100 Scale)
        # Formula: (Skills Match % * 0.5) + (Experience Match % * 0.3) + (Education % * 0.2)
        
        # 1. Skills Match (50% weight)
        job_skills = application.job.required_skills or []
        candidate_skills = profile.skills if profile and profile.skills else []
        skill_score = 0
        
        if job_skills:
            job_skills_lower = {s.lower() for s in job_skills}
            cand_skills_lower = {s.lower() for s in candidate_skills}
            
            # Fallback: if profile skills are empty, search in bio/cover letter
            if not cand_skills_lower:
                text_to_scan = ((profile.bio or "") + " " + (application.cover_letter or "")).lower()
                matches = sum(1 for skill in job_skills_lower if skill in text_to_scan)
                feedback.append(f"Skills: Detected {matches} req. skills in text content")
            else:
                matches = len(job_skills_lower.intersection(cand_skills_lower))
                feedback.append(f"Skills: {matches}/{len(job_skills_lower)} matched")
            
            match_percentage = matches / len(job_skills_lower)
            skill_score = (match_percentage * 100) * 0.5
            feedback[-1] += f" ({skill_score:.1f} pts)"
        else:
            skill_score = 40 # Standard fallback if job has no skills listed
            feedback.append("Skills: No job requirements listed (Baseline 40 pts)")

        # 2. Experience Match (30% weight)
        # Map Job Experience Level to required years
        experience_map = {
            "ENTRY_LEVEL": 0, "ASSOCIATE": 2, "MID_SENIOR": 5, "DIRECTOR": 8, "EXECUTIVE": 10
        }
        level = str(application.job.experience_level.value) if hasattr(application.job.experience_level, 'value') else str(application.job.experience_level)
        required_years = experience_map.get(level, 2)
        cand_years = profile.experience_years if profile else 0
        
        if cand_years >= required_years:
            exp_score = 30.0
        elif required_years > 0:
            exp_score = (cand_years / required_years) * 30.0
        else:
            exp_score = 30.0
        feedback.append(f"Experience: {cand_years}y vs {required_years}y req ({exp_score:.1f} pts)")

        # 3. Education & Certifications (20% weight)
        # Keyword search in bio and cover letter for education/cert markers
        edu_keywords = ["bachelor", "master", "degree", "phd", "certified", "aws", "pmp", "certification"]
        text_for_edu = (profile.bio or "").lower() + " " + (application.cover_letter or "").lower()
        edu_matches = sum(1 for kw in edu_keywords if kw in text_for_edu)
        
        # Max 2 keywords for full 20 points
        edu_score = min(edu_matches * 10, 20)
        feedback.append(f"Education/Certs: {edu_matches} markers found ({edu_score:.1f} pts)")

        # Calculate Final Match Score
        application.match_score = min(int(skill_score + exp_score + edu_score), 100)
        application.ai_feedback = " | ".join(feedback)
        
        if application.status == ApplicationStatus.APPLIED:
            application.status = ApplicationStatus.SCREENING
            
        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)

        # --- AUTO SHORTLISTING LOGIC ---
        # Threshold: 60 (Represents a strong overall match in the ATS system)
        AUTO_SHORTLIST_THRESHOLD = 60
        
        if application.match_score >= AUTO_SHORTLIST_THRESHOLD:
             print(f"Auto-shortlisting application {application.id} with ATS score {application.match_score}")
             return await self.shortlist_candidate(application.id)
             
        return application

    async def shortlist_candidate(self, application_id: int) -> Application:
        """
        Shortlist a candidate and send interview invitation.
        """
        application = await self.get_application_by_id(application_id)
        if not application:
            raise ValueError("Application not found")
            
        # 1. Update Status
        application.status = ApplicationStatus.SHORTLISTED
        self.db.add(application)
        await self.db.commit()

        # 2. Check if we should skip email based on city (Safety net)
        if not application.city or application.city.lower() != "haripur":
            logger.info(f"[SHORTLIST] Email skipped for application {application_id} - not Haripur.")
            application.email_delivery_status = "SKIPPED"
            application.email_logs = f"Email skipped: Candidate not from Haripur (City: {application.city})"
            self.db.add(application)
            await self.db.commit()
            await self.db.refresh(application)
            return application

        # 3. Send WhatsApp-invite email (duplicate guard)
        if application.email_delivery_status == "SENT":
            logger.info(f"[SHORTLIST] Email already sent for application {application_id} — skipping duplicate.")
            await self.db.refresh(application)
            return application

        from src.api.services.scheduling_service import SchedulingService
        sched_service = SchedulingService()

        candidate = application.candidate
        job = application.job

        result = await sched_service.schedule_interview(
            candidate_name=candidate.full_name or "Candidate",
            candidate_email=candidate.email,
            candidate_score=application.match_score or 0,
            job_title=job.title or "Position at Revnix",
        )

        if result["success"] and result.get("email_sent"):
            application.status = ApplicationStatus.INTERVIEW_INVITED
            application.email_delivery_status = "SENT"
            application.email_logs = f"WhatsApp-invite email sent. Score: {application.match_score}"
        else:
            application.email_delivery_status = "FAILED"
            application.email_logs = result.get("message", "Email failed or score below threshold.")
            
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
        from src.api.services.onboarding_service import OnboardingService
        from starlette.concurrency import run_in_threadpool
        from src.api.core.config import settings
        
        # Initiate onboarding to generate token
        onboarding_service = OnboardingService(self.db)
        onboarding = await onboarding_service.initiate_onboarding(application_id)
        
        token_param = f"?token={onboarding.onboarding_token}" if onboarding.onboarding_token else ""
        onboarding_link = f"{settings.FRONTEND_URL}/portal/onboarding/{application.id}{token_param}"
        
        await EmailService.send_offer_letter(
            candidate_email=candidate.email,
            candidate_name=candidate.full_name,
            job_title=job.title,
            company_name=job.company_name or "Evalyn AI",
            salary=salary_str,
            joining_date=joining_date,
            onboarding_link=onboarding_link
        )
        
        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)
        
        # Auto-Spawn Onboarding Record
        from src.api.services.onboarding_service import OnboardingService
        onb_service = OnboardingService(self.db)
        await onb_service.initiate_onboarding(application.id)
        
        return application

    async def delete_application(self, application_id: int) -> bool:
        """Permanently delete an application and its related data."""
        application = await self.get_application_by_id(application_id)
        if not application:
            return False
        
        # Explicitly delete the onboarding record first to avoid FK constraint errors
        from src.api.models.onboarding import Onboarding
        from sqlalchemy.future import select
        onboarding_result = await self.db.execute(
            select(Onboarding).where(Onboarding.application_id == application_id)
        )
        onboarding = onboarding_result.scalars().first()
        if onboarding:
            await self.db.delete(onboarding)
            await self.db.flush()
        
        await self.db.delete(application)
        await self.db.commit()
        return True
