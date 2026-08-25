import time
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.config import settings
from src.app.core.dependencies import get_current_user
from src.app.db.session import get_db
from src.app.modules.recruiting.models.job import JobStatus
from src.app.modules.platform.users.models.user import User
from src.app.modules.recruiting.schemas.job import (
    JobCreate,
    JobDraftRequest,
    JobExtendDeadlineRequest,
    JobImproveRequest,
    JobResponse,
    JobReviewRequest,
    JobSubmitEditRequest,
    JobDeclineEditRequest,
    JobUpdate,
)
from src.app.integrations.email.services.service import EmailService
from src.app.modules.recruiting.services.job_service import JobService

router = APIRouter()

_public_jobs_cache: dict = {}
CACHE_TTL = 60  # seconds
_PUBLIC_JOBS_CACHE_MAX_ENTRIES = 200  # pagination key combos; cheap safety cap, not a real LRU

_dashboard_stats_cache: dict = {}
DASHBOARD_STATS_CACHE_TTL = 20  # seconds — short enough that HR sees near-live counts


class SendToTeamRequest(BaseModel):
    emails: List[str]


def _build_job_details(job) -> str:
    job_type = job.job_type.value if job.job_type else None
    experience_level = job.experience_level.value if job.experience_level else None
    return (
        f"Title: {job.title}\n"
        f"Location: {job.location}\n"
        f"Type: {job_type}\n"
        f"Experience: {experience_level}\n"
        f"Department: {job.department}\n"
        f"\nDescription:\n{job.description}\n"
    )


@router.get("/ping")
async def ping(db: AsyncSession = Depends(get_db)):
    await db.execute(text("SELECT 1"))
    return {"message": "pong"}


@router.get("/stats/count")
async def get_jobs_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_service = JobService(db)
    count = await job_service.get_total_jobs_count()
    return {"total_jobs": count}


@router.get("/stats/dashboard")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = time.time()
    cached = _dashboard_stats_cache.get(current_user.id)
    if cached and now - cached[1] < DASHBOARD_STATS_CACHE_TTL:
        return cached[0]

    job_service = JobService(db)
    stats = await job_service.get_dashboard_stats(user_id=current_user.id)
    _dashboard_stats_cache[current_user.id] = (stats, now)
    return stats


@router.get("/public", response_model=List[JobResponse])
async def read_public_jobs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint for fetching published jobs (no authentication required)"""
    cache_key = f"{skip}_{limit}"
    now = time.time()

    if cache_key in _public_jobs_cache:
        data, timestamp = _public_jobs_cache[cache_key]
        if now - timestamp < CACHE_TTL:
            return data

    job_service = JobService(db)
    jobs = await job_service.get_jobs(skip=skip, limit=limit, status=JobStatus.PUBLISHED.value)
    if len(_public_jobs_cache) >= _PUBLIC_JOBS_CACHE_MAX_ENTRIES:
        _public_jobs_cache.clear()  # cheap reset rather than a full LRU — pagination combos are few and re-fill fast
    _public_jobs_cache[cache_key] = (jobs, now)
    return jobs


@router.get("", response_model=List[JobResponse])
async def read_jobs(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_service = JobService(db)
    return await job_service.get_my_jobs(user_id=current_user.id, skip=skip, limit=limit, status=status)


@router.post("", response_model=JobResponse)
async def create_job(
    job_data: JobCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_service = JobService(db)
    return await job_service.create_job(job_in=job_data, user_id=current_user.id)


@router.post("/generate-draft")
async def generate_draft(
    draft_data: JobDraftRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_service = JobService(db)
    return await job_service.generate_draft(draft_data)


@router.get("/team-members")
async def get_team_members(current_user: User = Depends(get_current_user)):
    mapping = [
        ("Operations Manager", settings.OPERATIONS_MANAGER_EMAIL),
        ("AI Lead", settings.LEAD_AI_EMAIL),
        ("Web Lead", settings.LEAD_WEB_EMAIL),
        ("SEO Lead", settings.LEAD_SEO_EMAIL),
        ("Shopify Lead", settings.LEAD_SHOPIFY_EMAIL),
        ("UI/UX Lead", settings.LEAD_UIUX_EMAIL),
    ]
    return [{"label": label, "email": email} for label, email in mapping if email]


@router.get("/{job_id}", response_model=JobResponse)
async def read_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Publicly accessible — allows candidates to view job details."""
    job_service = JobService(db)
    job = await job_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_data: JobUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_service = JobService(db)
    job = await job_service.update_job(job_id, job_data)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/improve", response_model=JobResponse)
async def improve_job(
    job_id: int,
    request: JobImproveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_service = JobService(db)
    job = await job_service.improve_job(job_id, request.feedback)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/publish", response_model=JobResponse)
async def publish_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_service = JobService(db)
    job = await job_service.publish_job(job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/send-to-team")
async def send_to_team(
    job_id: int,
    body: SendToTeamRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.emails:
        raise HTTPException(status_code=400, detail="No recipients selected")

    job_service = JobService(db)
    job = await job_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        review_url = f"{settings.FRONTEND_URL}/review-job/{job_id}"
        result = await EmailService.send_job_to_team(
            job.title, _build_job_details(job), body.emails, review_url=review_url
        )
        return {"message": f"Emails sent to {result['sent']} recipient(s)", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{job_id}/send-to-manager")
async def send_to_manager(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_service = JobService(db)
    job = await job_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        review_url = f"{settings.FRONTEND_URL}/review-job/{job_id}"
        await EmailService.send_job_to_manager(job.title, _build_job_details(job), review_url=review_url)
        return {"message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{job_id}/review", response_model=JobResponse)
async def review_job(
    job_id: int,
    review_data: JobReviewRequest,
    db: AsyncSession = Depends(get_db),
):
    job_service = JobService(db)
    job = await job_service.review_job(job_id, review_data.status, review_data.feedback)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/submit-edit", response_model=JobResponse)
async def submit_edit(
    job_id: int,
    edit_data: JobSubmitEditRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — team member submits proposed edits to a job post."""
    job_service = JobService(db)
    job = await job_service.submit_edit(
        job_id, edit_data.title, edit_data.description, edit_data.editor_email
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/accept-edit", response_model=JobResponse)
async def accept_edit(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """HR accepts the proposed edit — copies edited content to main fields."""
    job_service = JobService(db)
    job = await job_service.accept_edit(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/decline-edit", response_model=JobResponse)
async def decline_edit(
    job_id: int,
    request: JobDeclineEditRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """HR declines the proposed edit — clears edit data and stores feedback."""
    job_service = JobService(db)
    job = await job_service.decline_edit(job_id, request.feedback)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.patch("/{job_id}/extend-deadline", response_model=JobResponse)
async def extend_job_deadline(
    job_id: int,
    request: JobExtendDeadlineRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_service = JobService(db)
    job = await job_service.extend_deadline(job_id, request.expires_at)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/close", response_model=JobResponse)
async def close_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_service = JobService(db)
    job = await job_service.close_job(job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_service = JobService(db)
    deleted = await job_service.delete_job(job_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found")
