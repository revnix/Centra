from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class JobResponsibilities(BaseModel):
    items: List[str] = Field(
        ...,
        description="Key responsibilities for the role"
    )


class JobRequirements(BaseModel):
    required: List[str] = Field(
        ...,
        description="Mandatory requirements"
    )
    preferred: Optional[List[str]] = Field(
        default=None,
        description="Nice-to-have requirements"
    )


class JobPost(BaseModel):
    """
    Structured output model for Job Post / Job Description.
    Suitable for LLM structured outputs and validation.
    """

    job_title: str = Field(..., example="Senior Backend Engineer")
    location: str = Field(..., example="Remote")

    skills: List[str] = Field(
        ...,
        description="Core technical or professional skills"
    )

    responsibilities: JobResponsibilities
    requirements: JobRequirements

    benefits: Optional[List[str]] = Field(
        default=None,
        description="Offered benefits"
    )

    summary: str = Field(
        ...,
        description="Short role overview"
    )
