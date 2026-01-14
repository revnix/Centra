from src.flow.core.llm.chatgroq_model import get_chatgroq_llm
from src.flow.core.state_base import JDState
from pydantic import BaseModel, Field
from typing import List

# ---------------------------
# Pydantic Structured Output
# ---------------------------

class JDModel(BaseModel):
    job_title: str = Field(..., description="Job title")
    job_summary: str = Field(..., description="Short job summary")
    duties_responsibilities: List[str]
    qualifications_skills: List[str]
    company_name: str
    working_conditions: str
    compensation_benefits: str
    location: str
    benefits: List[str]

# ---------------------------
# Node: Generate JD
# ---------------------------

def generate_jd(state: JDState):
    """
    Generates a structured Job Description using ChatGroq + structured output.
    Safe for LangGraph (no KeyError).
    """

    #  LLM INSIDE FUNCTION (important for LangGraph)
    llm = get_chatgroq_llm()
    llm_structured = llm.with_structured_output(JDModel)

    #  SAFE STATE ACCESS (NO KeyError)
    job_title = state.get("job_title", "")
    job_summary = state.get("job_summary", "")
    duties = state.get("duties_responsibilities", [])
    qualifications = state.get("qualifications_skills", [])
    company_name = state.get("company_name", "Revnix")
    working_conditions = state.get("working_conditions", "")
    compensation = state.get("compensation_benefits", "")
    location = state.get("location", "")
    benefits = state.get("benefits", [])

    prompt = f"""
You are a senior HR professional.

Generate a professional Job Description strictly following the required JSON schema.

Job Title: {job_title}
Job Summary: {job_summary}
Duties & Responsibilities: {duties}
Qualifications & Skills: {qualifications}
Company Name: {company_name}
Working Conditions: {working_conditions}
Compensation & Benefits: {compensation}
Location: {location}
Benefits: {benefits}
"""

    try:
        result: JDModel = llm_structured.invoke(prompt)

        #  Return dict compatible with LangGraph state
        return {
            **result.model_dump(),
            "approved": None
        }

    except Exception as e:
        # Never crash graph
        return {
            "error": str(e),
            "approved": None
        }
