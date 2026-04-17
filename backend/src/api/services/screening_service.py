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
            feedback = evaluation.get("feedback", "")
            
            # MANDATORY RULE: Shortlist if score >= 60
            is_qualified = score >= 60

            # 4. Update Application
            application.match_score = float(score)
            application.ai_feedback = feedback
            # Set final status before committing so DB is always consistent
            application.status = ApplicationStatus.SHORTLISTED if is_qualified else ApplicationStatus.SCREENING
            
            # Persist score and status to DB FIRST before any downstream handlers
            self.db.add(application)
            await self.db.commit()
            await self.db.refresh(application)
            logger.info(f"Screening completed for application {application_id}. Score: {score}, Qualified: {is_qualified}")

            if is_qualified:
                # Trigger centralized shortlisting: sends the shortlist email to candidate
                from src.api.utils.application_handler import handle_new_application
                logger.info(f"Score {score} >= 60 → Triggering shortlist email for application {application_id}")
                await handle_new_application(self.db, application.id, notify_hr=False)
            else:
                # Optional: Handle rejection or just leave as screened
                pass

        except Exception as e:
            logger.error(f"Error during screening for application {application_id}: {str(e)}")
            await self.db.rollback()
