"""Centra ERP FastMCP Server.

Exposes real existing backend business logic (JobService, CandidateService,
ApplicationService, DashboardSummaryService) as standard Model Context Protocol (MCP) tools.
Does NOT create any fake or dummy REST endpoints.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional

# Ensure UTF-8 console output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

# Ensure backend root is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from fastmcp import FastMCP
from pydantic import BaseModel, Field

from src.app.db.session import AsyncSessionLocal
from src.app.modules.dashboard.services.summary_service import DashboardSummaryService
from src.app.modules.recruiting.models.job import JobStatus
from src.app.modules.recruiting.schemas.resume_pooling import ResumePoolingQuery
from src.app.modules.recruiting.services.application_service import ApplicationService
from src.app.modules.recruiting.services.candidate_service import CandidateService
from src.app.modules.recruiting.services.job_service import JobService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("centra.mcp_server")

# Instantiate FastMCP server
mcp = FastMCP(
    name="Centra ERP FastMCP Server",
)


@mcp.tool(
    name="get_published_jobs",
    description="Retrieve the list of all currently published job openings in the organization, including job titles, departments, locations, and descriptions.",
)
async def get_published_jobs(
    skip: int = Field(0, description="Number of items to skip for pagination"),
    limit: int = Field(20, description="Maximum number of published jobs to return"),
) -> List[Dict[str, Any]]:
    """Fetches published job posts directly from JobService using the existing DB session."""
    async with AsyncSessionLocal() as session:
        service = JobService(session)
        jobs = await service.get_jobs(skip=skip, limit=limit, status=JobStatus.PUBLISHED.value)
        
        results = []
        for job in jobs:
            results.append({
                "id": job.id,
                "title": job.title,
                "department": job.department,
                "location": job.location,
                "job_type": job.job_type.value if hasattr(job.job_type, "value") else str(job.job_type or ""),
                "experience_level": job.experience_level.value if hasattr(job.experience_level, "value") else str(job.experience_level or ""),
                "status": job.status.value if hasattr(job.status, "value") else str(job.status or ""),
                "description": job.description,
                "created_at": str(job.created_at) if job.created_at else None,
            })
        return results


@mcp.tool(
    name="get_job_details",
    description="Fetch full details for a specific job post by its unique numeric job ID.",
)
async def get_job_details(
    job_id: int = Field(..., description="The unique integer ID of the job"),
) -> Dict[str, Any]:
    """Fetches single job details from JobService."""
    async with AsyncSessionLocal() as session:
        service = JobService(session)
        job = await service.get_job(job_id=job_id)
        if not job:
            return {"error": f"Job with ID {job_id} not found", "found": False}
        
        return {
            "found": True,
            "id": job.id,
            "title": job.title,
            "department": job.department,
            "location": job.location,
            "job_type": job.job_type.value if hasattr(job.job_type, "value") else str(job.job_type or ""),
            "experience_level": job.experience_level.value if hasattr(job.experience_level, "value") else str(job.experience_level or ""),
            "status": job.status.value if hasattr(job.status, "value") else str(job.status or ""),
            "description": job.description,
            "created_at": str(job.created_at) if job.created_at else None,
            "expires_at": str(job.expires_at) if job.expires_at else None,
        }


@mcp.tool(
    name="search_resume_candidates",
    description="Search, filter, and score candidates in the talent pool based on required skills, minimum years of experience, city/location, and target job description.",
)
async def search_resume_candidates(
    skills: List[str] = Field(default=[], description="List of required skills, e.g. ['Python', 'FastAPI', 'React']"),
    experience_years: int = Field(default=0, description="Minimum years of professional experience"),
    city: Optional[str] = Field(default=None, description="City or living location of candidate"),
    qualification: Optional[str] = Field(default=None, description="Required degree or qualification (e.g. 'Bachelor')"),
    job_description: Optional[str] = Field(default=None, description="Optional job requirements or description for semantic relevance matching"),
    limit: int = Field(default=10, description="Maximum number of candidate matches to return"),
) -> Dict[str, Any]:
    """Leverages CandidateService.search_resume_pool to score and return matching talent pool profiles."""
    async with AsyncSessionLocal() as session:
        service = CandidateService(session)
        query = ResumePoolingQuery(
            skills=skills,
            experience_years=experience_years,
            city=city,
            qualification=qualification,
            job_description=job_description,
            limit=limit,
        )
        response = await service.search_resume_pool(query)
        
        candidates_data = []
        for cand in response.candidates:
            candidates_data.append({
                "user_id": cand.user_id,
                "full_name": cand.full_name,
                "email": cand.email,
                "phone": cand.phone,
                "city": cand.city,
                "qualification": cand.qualification,
                "experience_years": cand.experience_years,
                "skills": cand.skills,
                "match_score": cand.match_score,
                "score_breakdown": cand.score_breakdown.model_dump() if cand.score_breakdown else None,
            })
        
        return {
            "total_matches": response.total,
            "candidates": candidates_data,
        }


@mcp.tool(
    name="get_recruiting_dashboard_summary",
    description="Retrieve high-level HR and Recruiting organizational summary metrics, including total jobs, application pipeline breakdown, and hiring statistics.",
)
async def get_recruiting_dashboard_summary() -> Dict[str, Any]:
    """Aggregates metrics from DashboardSummaryService and JobService."""
    async with AsyncSessionLocal() as session:
        summary_svc = DashboardSummaryService(session)
        job_svc = JobService(session)
        
        hr_summary = await summary_svc.hr_admin_summary()
        total_jobs = await job_svc.get_total_jobs_count()
        
        return {
            "total_jobs_count": total_jobs,
            "recruiting_and_org_summary": hr_summary,
        }


@mcp.tool(
    name="get_application_details",
    description="Fetch full details for an application by its unique application ID, including candidate name, job applied, status, and screening score.",
)
async def get_application_details(
    application_id: int = Field(..., description="The unique integer ID of the application"),
) -> Dict[str, Any]:
    """Fetches candidate application details from ApplicationService."""
    async with AsyncSessionLocal() as session:
        service = ApplicationService(session)
        app = await service.get_application_by_id(application_id)
        if not app:
            return {"found": False, "error": f"Application {application_id} not found"}
        
        return {
            "found": True,
            "id": app.id,
            "candidate_id": app.candidate_id,
            "candidate_name": app.candidate.full_name if app.candidate else None,
            "candidate_email": app.candidate.email if app.candidate else None,
            "job_id": app.job_id,
            "job_title": app.job.title if app.job else None,
            "status": app.status.value if hasattr(app.status, "value") else str(app.status),
            "match_score": app.match_score,
            "source": app.source,
            "created_at": str(app.created_at) if app.created_at else None,
        }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Centra ERP FastMCP Server")
    parser.add_argument(
        "--transport",
        default="http",
        choices=["http", "sse", "stdio"],
        help="Transport protocol (http, sse, stdio)",
    )
    parser.add_argument("--host", default="0.0.0.0", help="Host IP address")
    parser.add_argument("--port", type=int, default=8001, help="Port to run server on")

    args = parser.parse_args()

    print(
        f"🚀 Starting Centra ERP FastMCP Server [transport={args.transport}, host={args.host}, port={args.port}]"
    )
    mcp.run(transport=args.transport, host=args.host, port=args.port)
