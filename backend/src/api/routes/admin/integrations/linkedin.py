from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.core.dependencies import get_current_user
from src.api.models.user import User
from src.api.services.linkedin_service import LinkedInService
from src.api.schemas.integration import (
    LinkedInAuthURLResponse, 
    LinkedInCallbackRequest, 
    IntegrationResponse,
    LinkedInPublishRequest
)
import secrets

router = APIRouter()

@router.get("/login", response_model=LinkedInAuthURLResponse)
async def linkedin_login(
    db: AsyncSession = Depends(get_db)
):
    """
    Step 1: Get the LinkedIn authorization URL.
    """
    linkedin_service = LinkedInService(db)
    state = secrets.token_urlsafe(16)
    auth_url = linkedin_service.get_authorization_url(state)
    return {"authorization_url": auth_url}

@router.post("/callback", response_model=IntegrationResponse)
async def linkedin_callback(
    request_data: LinkedInCallbackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 2: Handle the LinkedIn callback data sent from frontend.
    """
    linkedin_service = LinkedInService(db)
    try:
        user = current_user
        token_data = await linkedin_service.exchange_code_for_token(request_data.code)
        access_token = token_data.get("access_token")
        profile_data = await linkedin_service.get_user_profile(access_token)
        
        integration = await linkedin_service.save_integration(
            user_id=user.id,
            token_data=token_data,
            profile_data=profile_data
        )
        return integration
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/status")
async def get_linkedin_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if LinkedIn is connected for the current user."""
    try:
        from sqlalchemy.future import select
        from src.api.models.integration import UserIntegration
        
        user = current_user
        print(f"DEBUG: Checking LinkedIn status for user_id={user.id}")
        
        result = await db.execute(
            select(UserIntegration).where(
                UserIntegration.user_id == user.id,
                UserIntegration.platform == "linkedin"
            )
        )
        integration = result.scalars().first()
        
        if not integration:
            print(f"DEBUG: No LinkedIn integration found for user_id={user.id}")
            return {"connected": False}
            
        print(f"DEBUG: LinkedIn connected for user_id={user.id}")
        return {
            "connected": True,
            "platform_user_id": integration.platform_user_id,
            "created_at": integration.created_at,
            "expires_at": integration.expires_at
        }
    except Exception as e:
        print(f"ERROR in get_linkedin_status: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/disconnect")
async def disconnect_linkedin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disconnect LinkedIn integration."""
    from sqlalchemy import delete
    from src.api.models.integration import UserIntegration
    
    user = current_user
    await db.execute(
        delete(UserIntegration).where(
            UserIntegration.user_id == user.id,
            UserIntegration.platform == "linkedin"
        )
    )
    await db.commit()
    return {"message": "LinkedIn disconnected successfully"}

@router.post("/publish")
async def linkedin_publish(
    publish_data: LinkedInPublishRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Publish a post to LinkedIn with optional article link."""
    linkedin_service = LinkedInService(db)
    user = current_user
    try:
        result = await linkedin_service.post_to_linkedin(
            user_id=user.id,
            text=publish_data.text,
            article_url=publish_data.article_url
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
