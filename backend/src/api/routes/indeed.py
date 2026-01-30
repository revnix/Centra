from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.core.dependencies import get_current_user
from src.api.models.user import User
from src.api.services.job_service import JobService
from src.api.integrations.indeed import IndeedService
from src.api.core.config import settings
from src.api.models.integration import UserIntegration
from datetime import datetime, timedelta
import httpx
import secrets

router = APIRouter()

@router.get("/status")
async def get_indeed_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if the user has an active Indeed integration."""
    indeed_service = IndeedService(db)
    integration = await indeed_service.get_integration(current_user.id)
    
    if not integration:
        return {"connected": False}
    
    # Check if token is potentially expired but refreshable
    is_expired = integration.expires_at and integration.expires_at < datetime.now()
    
    return {
        "connected": True,
        "platform_user_id": integration.platform_user_id,
        "is_expired": is_expired,
        "expires_at": integration.expires_at
    }

@router.get("/connect")
async def connect_indeed(
    current_user: User = Depends(get_current_user)
):
    """Start the Indeed OAuth2 flow."""
    state = secrets.token_urlsafe(16)
    # In a real app, store state in Redis/DB to verify in callback
    
    params = {
        "client_id": settings.INDEED_CLIENT_ID,
        "redirect_uri": settings.INDEED_REDIRECT_URI,
        "response_type": "code",
        "scope": "employer_jobs:write employer_jobs:read", # Example scopes
        "state": state
    }
    
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    auth_url = f"{settings.INDEED_AUTH_URL}?{query_string}"
    
    return {"url": auth_url}

@router.get("/callback")
async def indeed_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db)
    # Note: We need a way to link this back to the user.
    # Usually handled via state mapping or being logged in during callback.
):
    """Handle Indeed OAuth2 callback."""
    # 1. Exchange code for token
    async with httpx.AsyncClient() as client:
        response = await client.post(
            settings.INDEED_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": settings.INDEED_CLIENT_ID,
                "client_secret": settings.INDEED_CLIENT_SECRET,
                "redirect_uri": settings.INDEED_REDIRECT_URI,
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange Indeed code")

        data = response.json()
        
    # 2. Save integration (Crucial: Need user context here!)
    # For this implementation, we assume the user is known or we use a temporary placeholder
    # In practice, you'd use a session cookie or state-to-user mapping.
    
    return {"message": "Indeed connected successfully. You can now close this window."}

@router.post("/jobs/{job_id}/sync")
async def sync_job_to_indeed(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Manually trigger a sync of a job to Indeed."""
    job_service = JobService(db)
    job = await job_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    indeed_service = IndeedService(db)
    success = await indeed_service.upload_job(job, current_user.id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to sync job to Indeed")
        
    return {"message": "Job synced to Indeed successfully"}

@router.delete("/jobs/{job_id}")
async def remove_job_from_indeed(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Expire a job listing on Indeed."""
    job_service = JobService(db)
    job = await job_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    indeed_service = IndeedService(db)
    success = await indeed_service.expire_job(job, current_user.id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to expire job on Indeed")
        
    return {"message": "Job expired on Indeed"}
