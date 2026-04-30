import logging
from src.api.services.email_service import EmailService
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

SHORTLIST_SCORE_THRESHOLD = 70


class SchedulingService:
    async def schedule_interview(
        self,
        candidate_name: str,
        candidate_email: str,
        candidate_score: float,
        job_title: str = "Agentic AI Engineer",
    ) -> dict:
        if not candidate_email:
            logger.error("[SHORTLIST] ❌ Candidate email is missing.")
            return {"success": False, "message": "Candidate email is missing"}

        if candidate_score < SHORTLIST_SCORE_THRESHOLD:
            logger.info(
                f"[SHORTLIST] Score {candidate_score} < {SHORTLIST_SCORE_THRESHOLD} "
                f"— skipping notification for {candidate_email}"
            )
            return {"success": False, "message": f"Score {candidate_score} below threshold {SHORTLIST_SCORE_THRESHOLD}"}

        logger.info(
            f"[SHORTLIST] Score {candidate_score} >= {SHORTLIST_SCORE_THRESHOLD} "
            f"— triggering WhatsApp-invite email for {candidate_email}"
        )

        email_sent = await EmailService.send_shortlist_notification(
            candidate_email=candidate_email,
            candidate_name=candidate_name,
            job_title=job_title,
        )

        return {
            "success": True,
            "email_sent": email_sent,
        }
