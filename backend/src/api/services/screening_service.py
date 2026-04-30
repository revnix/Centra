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


def _evaluate_salary(expected_salary: float | None, job_max_salary: int | None) -> str:
    """
    Compare candidate's expected salary against the job budget.
    Returns: 'within_budget' | 'above_budget' | 'not_checked'
    """
    if expected_salary is None or job_max_salary is None:
        return "not_checked"
    return "above_budget" if expected_salary > job_max_salary else "within_budget"


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
            
            # Shortlist threshold: score >= 70
            SHORTLIST_THRESHOLD = 70
            is_qualified = score >= SHORTLIST_THRESHOLD

            # 4. Update Application — score, feedback, status
            application.match_score = float(score)
            application.ai_feedback = feedback
            application.status = ApplicationStatus.SHORTLISTED if is_qualified else ApplicationStatus.SCREENING

            # 5. Salary Filter
            salary_status = _evaluate_salary(application.expected_salary, job.salary_max)
            application.salary_filter_status = salary_status
            logger.info(
                f"[SALARY] App {application_id} — expected: {application.expected_salary}, "
                f"job max: {job.salary_max}, result: {salary_status}"
            )

            # Persist score, status, and salary filter to DB
            self.db.add(application)
            await self.db.commit()
            await self.db.refresh(application)
            logger.info(f"Screening completed for application {application_id}. Score: {score}, Qualified: {is_qualified}, Salary: {salary_status}")

            if is_qualified:
                # Block email if salary is above budget
                if salary_status == "above_budget":
                    application.email_delivery_status = "SKIPPED"
                    application.email_logs = (
                        f"Salary out of range — candidate expected "
                        f"{application.expected_salary:,.0f}, job budget max: {job.salary_max:,.0f}."
                    )
                    self.db.add(application)
                    await self.db.commit()
                    logger.info(
                        f"[SALARY FILTER] ⛔ App {application_id} — salary above budget, invite skipped. "
                        f"Expected: {application.expected_salary}, Max: {job.salary_max}"
                    )
                    return

                # Prevent duplicate emails — skip if already notified
                if application.email_delivery_status == "SENT":
                    logger.info(f"[SHORTLIST] Email already sent for application {application_id} — skipping duplicate.")
                else:
                    from src.api.services.scheduling_service import SchedulingService
                    scheduler = SchedulingService()

                    logger.info(f"[SHORTLIST] ✨ Score {score} >= {SHORTLIST_THRESHOLD} → sending WhatsApp-invite email to {candidate.email}")

                    result = await scheduler.schedule_interview(
                        candidate_name=candidate.full_name or "Candidate",
                        candidate_email=candidate.email,
                        candidate_score=score,
                        job_title=job.title or "Position at Revnix",
                    )

                    if result.get("success") and result.get("email_sent"):
                        application.email_delivery_status = "SENT"
                        application.email_logs = f"WhatsApp-invite email sent. Score: {score}"
                        self.db.add(application)
                        await self.db.commit()
                        logger.info(f"[SHORTLIST] ✅ Email sent and recorded for application {application_id}")
                    else:
                        application.email_delivery_status = "FAILED"
                        application.email_logs = result.get("message", "Email failed during screening.")
                        self.db.add(application)
                        await self.db.commit()
                        logger.error(f"[SHORTLIST] ❌ Email failed for application {application_id}: {result.get('message')}")

        except Exception as e:
            logger.error(f"Error during screening for application {application_id}: {str(e)}")
            await self.db.rollback()
