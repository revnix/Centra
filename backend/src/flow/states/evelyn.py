from typing import TypedDict, Dict, Any, Optional, List, Literal
from datetime import datetime

class PostState(TypedDict):
    """
    Global workflow state for Job Post generation
    with Human-in-the-Loop (HITL) support.
    """

    # Core Job Post fields
    job_title: str
    location: str
    skills: List[str]
    responsibilities: List[str]
    requirements: Dict[str, List[str]]  # 'required' and 'preferred'
    benefits: Optional[List[str]]
    summary: str

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