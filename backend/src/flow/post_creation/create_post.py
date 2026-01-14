from src.flow.states.evelyn import EVALN
from src.flow.prompts.human.jd_prompt import JD_GENERATION_PROMPT
from src.flow.model.llm_manager import get_llm
from src.flow.model.structure.jd import JobPost


def create_post(state: EVALN) -> dict:
    """
    Generates a Job Description and stores it as structured data.
    Returns state updates (not the full state).
    """
    # Existing JD (if regenerating)
    jd = state.get("jd", {})

    role = jd.get("role", "Software Engineer")
    location = jd.get("location", "Remote")
    skills = jd.get("skills", ["Python", "APIs", "Databases"])
    employment_type = jd.get("employment_type", "Full-time")
    experience_level = jd.get("experience_level", "Mid")
    company_name = jd.get("company_name", "Example Corp")
    feedback = jd.get("feedback", None)

    # Format prompt
    messages = JD_GENERATION_PROMPT.format_messages(
            job_title=role,
            location=location,
            skills=", ".join(skills),
            company_name=company_name,
            employment_type=employment_type,
            experience_level=experience_level,
            feedback=feedback or ""
        )

    # LLM CALL
    llm = get_llm().with_structured_output(JobPost)
    response = llm.invoke(messages)

    # Convert to dict if needed
    post_data = response.model_dump() if hasattr(response, 'model_dump') else response
        
    return {
            "jd":{
                **jd,
                "post": post_data,
                "status": "awaiting_review"
            }
        }
