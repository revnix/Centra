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
        description="List of core technical or professional skills required",
        examples=[["Python", "FastAPI", "PostgreSQL", "Docker"]]
    )

    responsibilities: List[str] = Field(
        ...,
        description="List of key responsibilities and duties for the role",
        examples=[["Design and implement APIs", "Mentor junior developers", "Participate in code reviews"]]
    )

    requirements: List[str] = Field(
        ...,
        description="List of mandatory requirements and qualifications",
        examples=[["5+ years of Python experience", "Bachelor's degree in CS", "Strong communication skills"]]
    )

    preferred_qualifications: List[str] = Field(
        default_factory=list,
        description="List of nice-to-have qualifications. Use empty array [] if none",
        examples=[["AWS certification", "Experience with microservices"]]
    )

    benefits: List[str] = Field(
        default_factory=list,
        description="List of benefits and perks offered. Use empty array [] if none",
        examples=[["Health insurance", "401k matching", "Remote work", "Unlimited PTO"]]
    )

