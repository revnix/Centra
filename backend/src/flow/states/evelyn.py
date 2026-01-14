from typing import Dict, Any, Optional, List, Literal
from typing_extensions import TypedDict
from datetime import datetime

class PostState(TypedDict, total=False):
    """
    Global workflow state for Job Post generation
    with Human-in-the-Loop (HITL) support.
    Matches the JobPost Pydantic model structure.
    """

    # Core Job Post fields (matching JobPost schema)
    job_title: str
    location: str
    summary: str
    skills: List[str]
    responsibilities: List[str]
    requirements: List[str]
    preferred_qualifications: List[str] 
    benefits: List[str]  

    # HITL fields
    feedback: Optional[str]           

    # Workflow metadata
    status: Literal[
        "draft",
        "awaiting_review",
        "approved",
        "rejected"
    ]

class JDState(TypedDict):
    """
    Global workflow state for Job Description (JD) generation
    with Human-in-the-Loop (HITL) support.
    """

    # Core JD fields
    role: str
    description: str
    location: str
    skills: List[str]
    company_name: str
    employment_type: Literal[
        "Full-time",
        "Part-time",
        "Contract",
        "Internship"
    ]
    experience_level: Literal[
        "Junior",
        "Mid",
        "Senior",
        "Lead"
    ]

    # HITL fields
    feedback: Optional[str]           

    # Workflow metadata
    status: Literal[
        "draft",
        "awaiting_review",
        "approved",
        "rejected"
    ]
    post: Optional[PostState]

class EVALN(TypedDict, total=False):
    """
    Global workflow state for JD generation with HITL.
    """
    jd: JDState