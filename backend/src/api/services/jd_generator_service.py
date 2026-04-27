import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class JDGeneratorService:
    """Modular service for AI-powered Job Description generation.

    Supports two modes:
    - Custom prompt: HR provides free-text instructions as the primary directive.
    - Default: Structured prompt built from job metadata (title, department, etc.).
    """

    async def generate_job_description(
        self,
        job_data: dict,
        prompt: Optional[str] = None,
    ) -> Any:
        from src.flow.prompts.human.jd_prompt import JD_CUSTOM_PROMPT, JD_GENERATION_PROMPT
        from src.flow.model.llm_manager import get_llm
        from src.flow.model.structure.jd import JobPost
        from fastapi.concurrency import run_in_threadpool

        # "Unspecified" signals the LLM to infer the title from the custom prompt
        job_title = job_data.get("title") or "Unspecified"
        company_name = job_data.get("department") or "Revnix"
        location = job_data.get("location") or "Remote"
        experience_level = job_data.get("experience_level") or "Mid"
        job_type = job_data.get("job_type") or "Full-time"
        using_custom_prompt = bool(prompt and prompt.strip())

        logger.info(
            "JD generation started | title=%s | custom_prompt=%s",
            job_title,
            using_custom_prompt,
        )

        try:
            if using_custom_prompt:
                provided_skills = ", ".join(job_data.get("required_skills", []))
                messages = JD_CUSTOM_PROMPT.format_messages(
                    custom_prompt=prompt.strip(),
                    job_title=job_title,
                    location=location,
                    company_name=company_name,
                    employment_type=job_type,
                    experience_level=experience_level,
                    skills=provided_skills,
                )
            else:
                provided_skills = ", ".join(job_data.get("required_skills", []))
                messages = JD_GENERATION_PROMPT.format_messages(
                    job_title=job_title,
                    location=location,
                    skills=provided_skills,
                    company_name=company_name,
                    employment_type=job_type,
                    experience_level=experience_level,
                    feedback="",
                )

            llm = get_llm().with_structured_output(JobPost)
            response = await run_in_threadpool(llm.invoke, messages)

            if not response:
                raise ValueError("LLM returned an empty response")

            logger.info("JD generation succeeded | title=%s", job_title)
            return response

        except Exception as exc:
            logger.error(
                "JD generation failed | title=%s | error=%s",
                job_title,
                str(exc),
                exc_info=True,
            )
            raise
