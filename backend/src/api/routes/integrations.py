from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.core.dependencies import get_current_user
from src.api.models.user import User
from src.api.schemas.integration import IntegrationResponse
from typing import List
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/resend-webhook")
async def resend_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint for Resend webhooks to update email delivery status.
    Tracks delivered, opened, clicked events.
    """
    try:
        payload = await request.json()
        event_type = payload.get("type")
        data = payload.get("data", {})
        message_id = data.get("email_id") or data.get("created_at") # Resend IDs vary by event
        
        if not event_type or not message_id:
            return {"status": "ignored", "reason": "missing data"}

        # Find the application by the message ID
        from sqlalchemy.future import select
        from src.api.models.application import Application
        
        result = await db.execute(
            select(Application).where(Application.last_interview_invite_id == message_id)
        )
        application = result.scalars().first()
        
        if not application:
            logger.info(f"Webhook received for unknown message_id: {message_id}")
            return {"status": "ignored", "reason": "unknown message_id"}

        # Map Resend events to our internal statuses
        status_map = {
            "email.delivered": "DELIVERED",
            "email.opened": "OPENED",
            "email.clicked": "OPENED", # Clicked implies opened
            "email.bounced": "FAILED",
            "email.complained": "FAILED"
        }
        
        new_status = status_map.get(event_type)
        if new_status:
            # Only upgrade status (don't go from OPENED back to DELIVERED)
            status_priority = {"NOT_SENT": 0, "SENT": 1, "DELIVERED": 2, "OPENED": 3, "ACCEPTED": 4, "DECLINED": 4}
            current_prio = status_priority.get(application.interview_invitation_status or "SENT", 1)
            new_prio = status_priority.get(new_status, 0)
            
            if new_prio > current_prio:
                application.interview_invitation_status = new_status
                application.email_logs = f"Status updated via webhook: {event_type}"
                
                db.add(application)
                await db.commit()
                logger.info(f"Application {application.id} status updated to {new_status}")

        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error processing Resend webhook: {e}")
        return {"status": "error", "detail": str(e)}

@router.get("", response_model=List[IntegrationResponse])
async def list_integrations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy.future import select
    from src.api.models.integration import UserIntegration
    
    user_id = current_user.id
    print(f"DEBUG: list_integrations request for user_id={user_id}")
    try:
        result = await db.execute(
            select(UserIntegration).where(UserIntegration.user_id == user_id)
        )
        integrations = result.scalars().all()
        print(f"DEBUG: Found {len(integrations)} integrations for user_id={user_id}")

        # Deduplicate: keep only the most recent record per platform
        seen: dict = {}
        for integration in sorted(integrations, key=lambda x: x.id, reverse=True):
            if integration.platform not in seen:
                seen[integration.platform] = integration
        return list(seen.values())
    except Exception as e:
        print(f"ERROR in list_integrations: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Database error while fetching integrations: {str(e)}"
        )
