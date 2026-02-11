from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from src.api.models.application import Application, ApplicationStatus
from src.api.models.interview import InterviewStatus
from src.api.services.interview_service import InterviewService
from src.api.services.email_service import EmailService
from src.flow.model.llm_manager import get_llm
from src.flow.interview.prompts import SCREENING_PROMPT
from langchain_core.messages import HumanMessage
from datetime import datetime, timezone, timedelta
import json
import logging

logger = logging.getLogger(__name__)

class ScreeningService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_and_invite(self, application_id: int):
        """
        AI Evaluation of an application followed by automated invitation if qualified.
        """
        # 1. Fetch Application with data
        from src.api.models.user import User
        from src.api.models.candidate import CandidateProfile
        
        result = await self.db.execute(
            select(Application)
            .options(
                joinedload(Application.job),
                joinedload(Application.candidate).joinedload(User.candidate_profile)
            )
            .where(Application.id == application_id)
        )
        application = result.scalars().first()
        if not application:
            logger.error(f"Application {application_id} not found for screening")
            return

        candidate = application.candidate
        profile = candidate.candidate_profile
        job = application.job

        # 2. Prepare AI Prompt
        prompt = SCREENING_PROMPT.format(
            job_title=job.title,
            job_skills=", ".join(job.required_skills) if job.required_skills else "N/A",
            job_description=job.description or "N/A",
            candidate_bio=profile.bio or "N/A",
            candidate_skills=", ".join(profile.skills) if profile.skills else "N/A",
            experience_years=profile.experience_years or 0,
            cover_letter=application.cover_letter or "N/A"
        )

        # 3. Call AI
        try:
            llm = get_llm()
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            
            # Parse response
            raw_content = response.content.strip()
            if "```json" in raw_content:
                raw_content = raw_content.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_content:
                raw_content = raw_content.split("```")[1].split("```")[0].strip()
                
            evaluation = json.loads(raw_content)
            
            score = evaluation.get("match_score", 0)
            is_qualified = evaluation.get("shortlist_decision", False)
            feedback = evaluation.get("feedback", "")

            # 4. Update Application
            application.match_score = float(score)
            application.ai_feedback = feedback
            application.status = ApplicationStatus.SCREENING
            
            if is_qualified:
                application.status = ApplicationStatus.SHORTLISTED
                
                # 5. Create Interview Session with Expiry
                int_service = InterviewService(self.db)
                session = await int_service.create_session(application.id)
                
                # Set 72-hour expiry
                session.expires_at = datetime.now(timezone.utc) + timedelta(hours=72)
                application.status = ApplicationStatus.INTERVIEW_INVITED
                
                # 6. Send Invitation Email
                # In a real app, this URL would be the absolute frontend URL
                interview_url = f"http://localhost:3000/interview/{session.token}"
                
                EmailService.send_interview_invitation(
                    candidate_email=candidate.email,
                    candidate_name=candidate.full_name,
                    job_title=job.title,
                    interview_url=interview_url
                )
            else:
                # Optional: Handle rejection or just leave as screened
                # application.status = ApplicationStatus.REJECTED
                pass

            self.db.add(application)
            await self.db.commit()
            logger.info(f"Screening completed for application {application_id}. Score: {score}, Qualified: {is_qualified}")

        except Exception as e:
            logger.error(f"Error during screening for application {application_id}: {str(e)}")
            await self.db.rollback()
