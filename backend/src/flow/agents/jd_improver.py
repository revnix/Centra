from src.flow.core.llm.chatgroq_model import get_chatgroq_llm
from src.flow.core.state_base import JDState
from pydantic import BaseModel
from typing import List
import json

# Get LLM
llm = get_chatgroq_llm()

# Define structured schema using Pydantic
class JDModel(BaseModel):
    job_title: str
    job_summary: str
    duties_responsibilities: List[str]
    qualifications_skills: List[str]
    company_name: str
    working_conditions: str
    compensation_benefits: str
    location: str
    benefits: List[str]

# Wrap LLM for structured output
llm_structured = llm.with_structured_output(JDModel)
def improve_jd(state: JDState):
    """
    Improves an existing JD based on feedback, returns structured output.
    """
    # Convert current JD fields into a single string
    jd_text = json.dumps({
        "job_title": state.get("job_title"),
        "job_summary": state.get("job_summary"),
        "duties_responsibilities": state.get("duties_responsibilities"),
        "qualifications_skills": state.get("qualifications_skills"),
        "company_name": state.get("company_name", "Revnix"),
        "working_conditions": state.get("working_conditions"),
        "compensation_benefits": state.get("compensation_benefits"),
        "location": state.get("location"),
        "benefits": state.get("benefits", [])
    }, indent=4)

    prompt = f"""
Improve this Job Description using the feedback below.
Keep company name as Revnix.

Job Description: {jd_text}
Feedback: {state['feedback']}
"""

    try:
        result = llm_structured.invoke(prompt)
        return {**result.dict(), "approved": None}
    except Exception as e:
        return {"jd_text": str(e), "approved": None}
