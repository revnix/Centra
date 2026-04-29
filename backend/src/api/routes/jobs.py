from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.services.job_service import JobService
from src.api.schemas.job import JobResponse, JobCreate, JobUpdate, JobImproveRequest, JobDraftRequest, JobReviewRequest
from src.api.core.dependencies import get_current_user
from src.api.models.user import User

router = APIRouter()

@router.get("/ping")
async def ping(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    await db.execute(text("SELECT 1"))
    return {"message": "pong"}

@router.get("/stats/count")
async def get_jobs_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns the total number of jobs created"""
    job_service = JobService(db)
    count = await job_service.get_total_jobs_count()
    return {"total_jobs": count}

from src.api.models.job import JobStatus

@router.get("/public", response_model=List[JobResponse])
async def read_public_jobs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Public endpoint for fetching published jobs (no authentication required)"""
    job_service = JobService(db)
    return await job_service.get_jobs(skip=skip, limit=limit, status=JobStatus.PUBLISHED.value)
@router.get("", response_model=List[JobResponse])
async def read_jobs(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Authenticated endpoint for fetching jobs created by the current user"""
    job_service = JobService(db)
    # Filter by current user to ensure they only see their own generated jobs
    return await job_service.get_my_jobs(user_id=current_user.id, skip=skip, limit=limit, status=status)

@router.post("", response_model=JobResponse)
async def create_job(
    job_data: JobCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new job posting"""
    job_service = JobService(db)
    return await job_service.create_job(job_in=job_data, user_id=current_user.id)

@router.post("/generate-draft")
async def generate_draft(
    draft_data: JobDraftRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate a structured job description draft using AI"""
    job_service = JobService(db)
    return await job_service.generate_draft(draft_data)

@router.get("/{job_id}", response_model=JobResponse)
async def read_job(
    job_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific job by ID.
    Publicly accessible to allow candidates to view job details.
    """
    job_service = JobService(db)
    job = await job_service.get_job(job_id)
    if not job:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_data: JobUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a specific job post manually"""
    job_service = JobService(db)
    job = await job_service.update_job(job_id, job_data)
    if not job:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/improve", response_model=JobResponse)
async def improve_job(
    job_id: int,
    request: JobImproveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Refine job post using AI based on HR feedback"""
    job_service = JobService(db)
    job = await job_service.improve_job(job_id, request.feedback)
    if not job:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/publish", response_model=JobResponse)
async def publish_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job_service = JobService(db)
    job = await job_service.publish_job(job_id, current_user.id)
    if not job:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")
    return job

from src.api.services.email_service import EmailService
@router.post("/{job_id}/send-to-manager")
async def send_to_manager(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send job details to Operation Manager via Resend."""
    job_service = JobService(db)
    job = await job_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    details = (
        f"Title: {job.title}\n"
        f"Location: {job.location}\n"
        f"Type: {job.job_type}\n"
        f"Experience: {job.experience_level}\n"
        f"Department: {job.department}\n"
        f"\nDescription:\n{job.description}\n"
    )

    try:
        from src.api.core.config import settings
        review_url = f"{settings.FRONTEND_URL}/review-job/{job_id}"
        await EmailService.send_job_to_manager(job.title, details, review_url=review_url)
        return {"message": "Email sent successfully"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{job_id}/review", response_model=JobResponse)
async def review_job(
    job_id: int,
    review_data: JobReviewRequest,
    db: AsyncSession = Depends(get_db)
):
    """Operation Manager review endpoint (approves or requests changes)"""
    job_service = JobService(db)
    job = await job_service.review_job(job_id, review_data.status, review_data.feedback)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
