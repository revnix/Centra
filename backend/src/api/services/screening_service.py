import secrets
from datetime import datetime, timezone, timedelta
from typing import Any
import json
import logging

from langchain_core.messages import HumanMessage
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from src.api.models.application import Application, ApplicationStatus
from src.api.models.interview import InterviewStatus
from src.api.models.screening import ScreeningTest
from src.api.services.interview_service import InterviewService
from src.api.services.email_service import EmailService
from src.flow.model.llm_manager import get_llm
from src.flow.interview.prompts import SCREENING_PROMPT

logger = logging.getLogger(__name__)


def _evaluate_salary(expected_salary: Any, job_max_salary: Any) -> str:
    """
    Compare candidate's expected salary against the job budget.
    Returns: 'within_budget' | 'above_budget' | 'not_checked'
    """
    if expected_salary is None or job_max_salary is None:
        return "not_checked"
    
    return "above_budget" if float(expected_salary) > float(job_max_salary) else "within_budget"


class ScreeningService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_and_invite(self, application_id: int):
        """
        AI Evaluation: assigns an ATS match score and updates the application status.
        NO automatic emails are sent — interview invitations are manual (sent by HR).
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

            # 4. Update Application — score, feedback, status only (no email)
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

            # Mark email status as PENDING — HR will send manually
            application.email_delivery_status = "PENDING"

            # Persist score, status, and salary filter to DB
            self.db.add(application)
            await self.db.commit()
            await self.db.refresh(application)

            if is_qualified:
                from src.api.services.application_service import ApplicationService
                app_service = ApplicationService(self.db)
                await app_service.ensure_resume_promoted_to_drive(int(candidate.id))

            logger.info(
                f"[SCREENING] ✅ App {application_id} scored: {score}/100 | "
                f"Qualified: {is_qualified} | Salary: {salary_status} | "
                f"Invite: MANUAL (HR action required)"
            )

        except Exception as e:
            logger.error(f"Error during screening for application {application_id}: {str(e)}")
            await self.db.rollback()

    # ── MCQ Screening Test ──────────────────────────────────────────────────────

    async def generate_questions(self, skills: list, experience_level: str) -> list:
        """Call Groq to produce 30 MCQ questions and return as a list of dicts."""
        skill_str = ", ".join(skills) if skills else "general programming and software development"
        prompt = (
            f"Generate exactly 30 multiple choice questions for a {experience_level} level "
            f"candidate with skills: {skill_str}.\n\n"
            "Mix: 10 basic, 12 intermediate, 8 advanced questions.\n"
            "Return ONLY a valid JSON array — no markdown, no extra text.\n"
            'Each element: {"id": <int>, "question": "<str>", '
            '"options": ["A. <str>", "B. <str>", "C. <str>", "D. <str>"], '
            '"correct_index": <int 0-3>, "difficulty": "basic"|"intermediate"|"advanced"}'
        )
        llm = get_llm()
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        raw: str = str(response.content).strip()

        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        questions: list = json.loads(raw)
        return questions[:30]

    async def generate_options_for_questions(self, raw_questions: list[str]) -> list[dict[str, Any]]:
        """Use the LLM to turn HR-provided question text into scored MCQs."""
        cleaned_questions = [question.strip() for question in raw_questions if question and question.strip()]
        if not cleaned_questions:
            raise ValueError("Add at least one screening question")

        prompt = (
            "Convert the following HR-provided screening questions into multiple choice questions.\n"
            "Keep each question's original meaning. For each question, generate exactly 4 plausible options, "
            "choose the single best correct answer, and set correct_index to the zero-based index of that answer.\n"
            "Return ONLY a valid JSON array, no markdown and no extra text.\n"
            'Each element must be: {"id": <int>, "question": "<original question>", '
            '"options": ["A. <str>", "B. <str>", "C. <str>", "D. <str>"], '
            '"correct_index": <int 0-3>, "difficulty": "basic"|"intermediate"|"advanced"}.\n\n'
            f"Questions:\n{json.dumps(cleaned_questions, ensure_ascii=False)}"
        )
        llm = get_llm()
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        raw: str = str(response.content).strip()

        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        generated: list = json.loads(raw)
        questions: list[dict[str, Any]] = []
        for index, item in enumerate(generated[: len(cleaned_questions)]):
            options = [str(option).strip() for option in item.get("options", []) if str(option).strip()]
            correct_index = int(item.get("correct_index", 0))
            if len(options) != 4 or correct_index < 0 or correct_index > 3:
                raise ValueError("LLM returned invalid options for one or more questions")
            difficulty = str(item.get("difficulty", "basic")).lower()
            questions.append(
                {
                    "id": index + 1,
                    "question": str(item.get("question") or cleaned_questions[index]).strip(),
                    "options": options,
                    "correct_index": correct_index,
                    "difficulty": difficulty if difficulty in {"basic", "intermediate", "advanced"} else "basic",
                }
            )

        if len(questions) != len(cleaned_questions):
            raise ValueError("LLM did not generate options for every question")
        return questions

    def calculate_score(self, questions: list, answers: list) -> float:
        """Return percentage of correct answers (0–100)."""
        if not questions:
            return 0.0
        correct = sum(
            1 for i, q in enumerate(questions)
            if i < len(answers) and answers[i] is not None and answers[i] == q.get("correct_index")
        )
        return round((correct / len(questions)) * 100, 1)

    async def create_screening_test(
        self,
        application_id: int,
        questions: list[dict[str, Any]] | None = None,
        raw_questions: list[str] | None = None,
        time_limit_minutes: int = 10,
    ) -> ScreeningTest:
        """Create a ScreeningTest row with HR-provided questions or AI-generated fallback."""
        # Return existing test if already created
        existing = await self.db.execute(
            select(ScreeningTest).where(ScreeningTest.application_id == application_id)
        )
        if (test := existing.scalars().first()):
            if questions is None and raw_questions and test.status != "COMPLETED":
                questions = await self.generate_options_for_questions(raw_questions)
            if questions and test.status != "COMPLETED":
                test.questions = questions
                test.total_questions = len(questions)
                test.time_limit_minutes = time_limit_minutes
                test.answers = None
                test.score = None
                test.status = "PENDING"
                test.started_at = None
                test.completed_at = None
                test.expires_at = datetime.now(timezone.utc) + timedelta(hours=72)
                self.db.add(test)
                await self.db.commit()
                await self.db.refresh(test)
            return test

        result = await self.db.execute(
            select(Application)
            .options(
                joinedload(Application.candidate).joinedload(
                    __import__("src.api.models.user", fromlist=["User"]).User.candidate_profile
                ),
                joinedload(Application.job),
            )
            .where(Application.id == application_id)
        )
        application = result.scalars().first()
        if not application:
            raise ValueError(f"Application {application_id} not found")

        from src.api.models.user import User as _User
        profile = getattr(application.candidate, "candidate_profile", None)
        skills: list = (profile.skills if profile and profile.skills else []) or (
            application.job.required_skills if application.job else []
        ) or []
        experience_level = str(getattr(application.job, "experience_level", "mid") or "mid")

        if questions is None:
            if raw_questions:
                questions = await self.generate_options_for_questions(raw_questions)
            else:
                questions = await self.generate_questions(skills, experience_level)

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=72)
        test = ScreeningTest(
            application_id=application_id,
            token=token,
            questions=questions,
            total_questions=len(questions),
            time_limit_minutes=time_limit_minutes,
            status="PENDING",
            expires_at=expires_at,
        )
        self.db.add(test)
        await self.db.commit()
        await self.db.refresh(test)
        return test
