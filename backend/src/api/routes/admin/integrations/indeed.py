from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.core.dependencies import get_current_user
from src.api.models.user import User
from src.api.services.indeed_service import IndeedService
from src.api.schemas.integration import (
    IndeedAuthURLResponse, 
    IndeedCallbackRequest, 
    IntegrationResponse,
    IndeedJobPostRequest
)
import secrets

router = APIRouter()

@router.get("/login", response_model=IndeedAuthURLResponse)
async def indeed_login(
    db: AsyncSession = Depends(get_db)
):
    """
    Step 1: Get the Indeed authorization URL.
    
    This endpoint generates an OAuth2 authorization URL that the frontend
    should redirect the user to. The user will authenticate with Indeed
    and grant permissions to your application.
    """
    indeed_service = IndeedService(db)
    state = secrets.token_urlsafe(16)  # CSRF protection token
    auth_url = indeed_service.get_authorization_url(state)
    return {"authorization_url": auth_url}

@router.post("/callback", response_model=IntegrationResponse)
async def indeed_callback(
    request_data: IndeedCallbackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 2: Handle the Indeed callback data sent from frontend.
    
    After the user authorizes the app on Indeed, they are redirected back
    with an authorization code. This endpoint exchanges that code for
    access tokens and saves the integration.
    """
    indeed_service = IndeedService(db)
    try:
        user = current_user
        # Exchange code for access token
        token_data = await indeed_service.exchange_code_for_token(request_data.code)
        access_token = token_data.get("access_token")
        
        # Get employer profile
        profile_data = await indeed_service.get_user_profile(access_token)
        
        # Save integration to database
        integration = await indeed_service.save_integration(
            user_id=user.id,
            token_data=token_data,
            profile_data=profile_data
        )
        return integration
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/status")
async def get_indeed_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if Indeed is connected for the current user.
    
    Returns connection status and integration details if connected.
    """
    from sqlalchemy.future import select
    from src.api.models.integration import UserIntegration
    
    user = current_user
    result = await db.execute(
        select(UserIntegration).where(
            UserIntegration.user_id == user.id,
            UserIntegration.platform == "indeed"
        )
    )
    integration = result.scalars().first()
    
    if not integration:
        return {"connected": False}
        
    return {
        "connected": True,
        "platform_user_id": integration.platform_user_id,
        "created_at": integration.created_at,
        "expires_at": integration.expires_at
    }

@router.delete("/disconnect")
async def disconnect_indeed(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Disconnect Indeed integration.
    
    Removes the stored integration credentials for the current user.
    """
    from sqlalchemy import delete
    from src.api.models.integration import UserIntegration
    
    user = current_user
    await db.execute(
        delete(UserIntegration).where(
            UserIntegration.user_id == user.id,
            UserIntegration.platform == "indeed"
        )
    )
    await db.commit()
    return {"message": "Indeed disconnected successfully"}

@router.post("/post-job")
async def indeed_post_job(
    job_data: IndeedJobPostRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Post a job to Indeed.
    
    Publishes a job posting to Indeed using the stored integration credentials.
    """
    indeed_service = IndeedService(db)
    user = current_user
    try:
        result = await indeed_service.post_job_to_indeed(
            user_id=user.id,
            title=job_data.title,
            description=job_data.description,
            location=job_data.location,
            company=job_data.company
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/token")
async def get_indeed_token(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a valid access token for Indeed API.
    Used for client-side API calls to bypass WAF blocking.
    """
    from src.api.core.config import settings
    indeed_service = IndeedService(db)
    
    # Get user integration
    integration = await indeed_service.get_integration(current_user.id)
    if not integration:
        raise HTTPException(status_code=404, detail="Indeed integration not found")
        
    try:
        # Get valid token (refreshes if needed)
        token = await indeed_service.get_valid_token(integration)
        
        return {
            "access_token": token,
            "employer_id": settings.INDEED_EMPLOYER_ID
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get token: {str(e)}")
