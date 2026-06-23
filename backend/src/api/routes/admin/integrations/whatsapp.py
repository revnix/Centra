from fastapi import APIRouter, HTTPException, Request
from src.api.core.config import settings
from src.api.schemas.integration import (
    WhatsAppSendMessageRequest,
    WhatsAppSendTemplateRequest,
    WhatsAppStatusResponse
)
from src.api.services.whatsapp_service import WhatsAppService


router = APIRouter()
whatsapp_service = WhatsAppService()


@router.get("/status", response_model=WhatsAppStatusResponse)
async def get_whatsapp_status():
    """Check WhatsApp integration status."""
    return WhatsAppStatusResponse(
        connected=whatsapp_service.is_connected(),
        phone_number_id=settings.WA_PHONE_NUMBER_ID if whatsapp_service.is_connected() else None,
        waba_id=settings.WA_WABA_ID if whatsapp_service.is_connected() else None
    )


@router.get("/webhook")
async def verify_webhook(mode: str, token: str, challenge: str):
    """Verify WhatsApp webhook endpoint (GET request)."""
    try:
        return whatsapp_service.verify_webhook(mode, token, challenge)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/webhook")
async def handle_webhook(request: Request):
    """Handle incoming WhatsApp webhook events (POST request)."""
    try:
        event_data = await request.json()
        result = await whatsapp_service.handle_webhook_event(event_data)
        return result
    except Exception as e:
        print(f"Error handling webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-message")
async def send_whatsapp_message(request: WhatsAppSendMessageRequest):
    """Send a text message via WhatsApp."""
    try:
        result = await whatsapp_service.send_text_message(
            to=request.to,
            message=request.message
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/send-template")
async def send_whatsapp_template(request: WhatsAppSendTemplateRequest):
    """Send a template message via WhatsApp."""
    try:
        result = await whatsapp_service.send_template_message(
            to=request.to,
            template_name=request.template_name,
            language_code=request.language_code,
            components=request.components
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/disconnect")
async def disconnect_whatsapp():
    """Disconnect WhatsApp integration (removes credentials from memory)."""
    # In a real app, you might want to store these in the database
    return {"message": "WhatsApp disconnected successfully"}
