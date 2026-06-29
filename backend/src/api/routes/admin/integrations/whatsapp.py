from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from src.api.db.session import get_db
from src.api.core.dependencies import get_current_user
from src.api.models.user import User
from src.api.schemas.integration import (
    WhatsAppSendMessageRequest,
    WhatsAppSendTemplateRequest,
    WhatsAppStatusResponse,
    WhatsAppConnectRequest,
    WhatsAppOAuthConnectRequest
)
from src.api.services.whatsapp_service import WhatsAppService
from src.api.models.integration import UserIntegration


router = APIRouter()


@router.post("/connect")
async def connect_whatsapp(
    request_data: WhatsAppConnectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Connect WhatsApp integration with user-provided credentials."""
    try:
        whatsapp_service = WhatsAppService(db)
        await whatsapp_service.connect(
            user_id=current_user.id,
            phone_number_id=request_data.phone_number_id,
            waba_id=request_data.waba_id,
            access_token=request_data.access_token,
            verify_token=request_data.verify_token
        )
        return {
            "message": "WhatsApp connected successfully",
            "connected": True,
            "phone_number_id": request_data.phone_number_id,
            "waba_id": request_data.waba_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/oauth-connect")
async def oauth_connect_whatsapp(
    request_data: WhatsAppOAuthConnectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Connect WhatsApp using Facebook OAuth Code."""
    try:
        whatsapp_service = WhatsAppService(db)
        integration = await whatsapp_service.connect_via_oauth(
            user_id=current_user.id,
            code=request_data.code
        )
        return {
            "message": "WhatsApp connected successfully via Facebook",
            "connected": True,
            "phone_number_id": integration.extra_data.get("phone_number_id"),
            "waba_id": integration.extra_data.get("waba_id")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status", response_model=WhatsAppStatusResponse)
async def get_whatsapp_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check WhatsApp integration status for current user."""
    try:
        whatsapp_service = WhatsAppService(db)
        is_connected = await whatsapp_service.is_connected(current_user.id)

        phone_number_id = None
        waba_id = None
        if is_connected:
            integration = await whatsapp_service.get_integration(current_user.id)
            if integration:
                import json as _json
                data = _json.loads(str(integration.access_token))
                phone_number_id = data.get("phone_number_id")
                waba_id = data.get("waba_id")

        return WhatsAppStatusResponse(
            connected=is_connected,
            phone_number_id=phone_number_id,
            waba_id=waba_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/webhook")
async def verify_webhook(
    mode: str, 
    token: str, 
    challenge: str,
    db: AsyncSession = Depends(get_db)
):
    """Verify WhatsApp webhook endpoint (GET request)."""
    try:
        from src.api.services.whatsapp_service import WhatsAppService
        whatsapp_service = WhatsAppService(db)
        return await whatsapp_service.verify_webhook_token(mode, token, challenge)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/webhook")
async def handle_webhook(request: Request):
    """Handle incoming WhatsApp webhook events (POST request)."""
    try:
        event_data = await request.json()
        from src.api.services.whatsapp_service import WhatsAppService
        # Webhook handling doesn't need a specific user for now
        print(f"Received WhatsApp webhook event: {event_data}")
        return {"status": "received", "data": event_data}
    except Exception as e:
        print(f"Error handling webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-message")
async def send_whatsapp_message(
    request: WhatsAppSendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a text message via WhatsApp using current user's credentials."""
    try:
        whatsapp_service = WhatsAppService(db)
        result = await whatsapp_service.send_text_message(
            user_id=current_user.id,
            to=request.to,
            message=request.message
        )
        return {"status": "success", "data": result}
    except Exception as e:
        import httpx
        if isinstance(e, httpx.HTTPStatusError):
            print(f"Graph API Error: {e.response.text}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/send-template")
async def send_whatsapp_template(
    request: WhatsAppSendTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a template message via WhatsApp using current user's credentials."""
    try:
        whatsapp_service = WhatsAppService(db)
        result = await whatsapp_service.send_template_message(
            user_id=current_user.id,
            to=request.to,
            template_name=request.template_name,
            language_code=request.language_code,
            components=request.components
        )
        return {"status": "success", "data": result}
    except Exception as e:
        import httpx
        if isinstance(e, httpx.HTTPStatusError):
            print(f"Graph API Error: {e.response.text}")
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/disconnect")
async def disconnect_whatsapp(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disconnect WhatsApp integration (removes credentials from database)."""
    await db.execute(
        delete(UserIntegration).where(
            UserIntegration.user_id == current_user.id,
            UserIntegration.platform == "whatsapp"
        )
    )
    await db.commit()
    return {"message": "WhatsApp disconnected successfully"}
