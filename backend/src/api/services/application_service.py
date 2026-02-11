from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
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
        
        # 2. Create Interview Session
        from src.api.services.interview_service import InterviewService
        int_service = InterviewService(self.db)
        
        # 72 hours expiry
        session = await int_service.create_session(application.id, expiry_hours=72)
        
        # 3. Send Email
        from src.api.services.email_service import EmailService
        from src.api.core.config import settings
        
        # Generate link
        interview_link = f"{settings.FRONTEND_URL}/interview/{session.token}"
        
        candidate = application.candidate
        job = application.job
        
        from starlette.concurrency import run_in_threadpool

        sent = await run_in_threadpool(
            EmailService.send_interview_invitation,
            candidate_email=candidate.email,
            candidate_name=candidate.full_name,
            job_title=job.title if job else "the position",
            interview_link=interview_link,
            expiry_hours=72
        )
        
        if sent:
            application.status = ApplicationStatus.INTERVIEW_INVITED
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

    async def delete_application(self, application_id: int) -> bool:
        """Permanently delete an application and its related data."""
        application = await self.get_application_by_id(application_id)
        if not application:
            return False
        
        await self.db.delete(application)
        await self.db.commit()
        return True
