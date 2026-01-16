from typing import List
from pydantic import BaseModel, Field


class JobPost(BaseModel):
    """
    Structured output model for Job Post / Job Description.
    All fields are required. Use empty arrays [] for optional list fields if not applicable.
    """

    job_title: str = Field(
        ..., 
        description="Job title for the role",
        examples=["Senior Backend Engineer", "Product Manager"]
    )
    
    location: str = Field(
        ..., 
        description="Job location",
        examples=["Remote", "New York, NY", "San Francisco, CA"]
    )

    summary: str = Field(
        ...,
        description="Short overview of the role in 2-3 sentences"
    )

    skills: List[str] = Field(
        ...,
        description="A flat list of core technical or professional skills strings. Do NOT use nested lists.",
        examples=["Python", "FastAPI", "PostgreSQL", "Docker"]
    )

    responsibilities: List[str] = Field(
        ...,
        description="A flat list of key responsibility strings. Do NOT use nested lists.",
        examples=["Design and implement APIs", "Mentor junior developers"]
    )

    requirements: List[str] = Field(
        ...,
        description="A flat list of mandatory requirement strings. Do NOT use nested lists.",
        examples=["5+ years of Python experience", "Bachelor's degree in CS"]
    )

    preferred_qualifications: List[str] = Field(
        default_factory=list,
        description="A flat list of nice-to-have qualification strings. Use empty array [] if none. Do NOT use nested lists.",
        examples=["AWS certification", "Experience with microservices"]
    )

    benefits: List[str] = Field(
        default_factory=list,
        description="A flat list of benefits and perk strings. Use empty array [] if none. Do NOT use nested lists.",
        examples=["Health insurance", "401k matching", "Remote work"]
    )

