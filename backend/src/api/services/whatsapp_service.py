import httpx
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.api.models.integration import UserIntegration
from src.api.core.config import settings
from src.api.core.encryption import get_encryption_service


class WhatsAppService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.encryption_service = get_encryption_service(settings.ENCRYPTION_KEY)

    async def get_integration(self, user_id: int) -> Optional[UserIntegration]:
        """Get WhatsApp integration for a user from database."""
        result = await self.db.execute(
            select(UserIntegration).where(
                UserIntegration.user_id == user_id,
                UserIntegration.platform == "whatsapp"
            )
        )
        return result.scalars().first()

    async def is_connected(self, user_id: int) -> bool:
        """Check if WhatsApp is connected for a user."""
        integration = await self.get_integration(user_id)
        if not integration or not integration.extra_data:
            return False
        extra_data = integration.extra_data
        return all([
            extra_data.get("phone_number_id"),
            extra_data.get("waba_id"),
            integration.access_token,
            extra_data.get("verify_token")
        ])

    async def get_credentials(self, user_id: int) -> Dict[str, str]:
        """Get WhatsApp credentials for a user."""
        integration = await self.get_integration(user_id)
        if not integration or not integration.extra_data:
            raise Exception("WhatsApp integration not configured")
        
        extra_data = integration.extra_data
        return {
            "phone_number_id": extra_data["phone_number_id"],
            "waba_id": extra_data["waba_id"],
            "access_token": self.encryption_service.decrypt(integration.access_token),
            "verify_token": self.encryption_service.decrypt(extra_data["verify_token"]),
            "graph_api_url": f"https://graph.facebook.com/v25.0"
        }

    def get_headers(self, access_token: str) -> Dict[str, str]:
        """Get authorization headers for WhatsApp API."""
        return {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

    def _normalize_phone_number(self, phone: str) -> str:
        """Clean up and normalize phone number for WhatsApp API.
        
        - Remove all non-digit characters
        - If it starts with 0, replace with country code (default 92 for Pakistan)
        - Ensure it's in international format without +
        """
        cleaned = ''.join(c for c in phone if c.isdigit())
        if not cleaned:
            raise ValueError("Invalid phone number: no digits found")
        
        # Handle numbers starting with 0 (local format)
        if cleaned.startswith('0'):
            # Default to Pakistan country code (92)
            cleaned = '92' + cleaned[1:]
        
        print(f"Normalized phone: {phone} -> {cleaned}")
        return cleaned

    async def send_text_message(self, user_id: int, to: str, message: str) -> Dict[str, Any]:
        """Send a text message to a WhatsApp number."""
        credentials = await self.get_credentials(user_id)

        # Normalize the phone number
        normalized_to = self._normalize_phone_number(to)
        
        url = f"{credentials['graph_api_url']}/{credentials['phone_number_id']}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": normalized_to,
            "text": {"body": message}
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url, 
                headers=self.get_headers(credentials['access_token']), 
                json=payload
            )
            response.raise_for_status()
            return response.json()

    async def send_template_message(
        self,
        user_id: int,
        to: str,
        template_name: str,
        language_code: str = "en_US",
        components: list = []
    ) -> Dict[str, Any]:
        """Send a template message to a WhatsApp number."""
        credentials = await self.get_credentials(user_id)

        # Normalize the phone number
        normalized_to = self._normalize_phone_number(to)
        
        url = f"{credentials['graph_api_url']}/{credentials['phone_number_id']}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": normalized_to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": components
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url, 
                headers=self.get_headers(credentials['access_token']), 
                json=payload
            )
            response.raise_for_status()
            return response.json()

    async def connect(
        self,
        user_id: int,
        phone_number_id: str,
        waba_id: str,
        access_token: str,
        verify_token: str
    ) -> UserIntegration:
        """Save WhatsApp integration credentials for a user."""
        encrypted_access_token = self.encryption_service.encrypt(access_token)
        encrypted_verify_token = self.encryption_service.encrypt(verify_token)

        # Check if integration already exists
        existing_integration = await self.get_integration(user_id)
        
        from sqlalchemy.orm.attributes import flag_modified
        if existing_integration:
            # Update existing integration
            existing_integration.access_token = encrypted_access_token
            existing_integration.extra_data = {
                "phone_number_id": phone_number_id,
                "waba_id": waba_id,
                "verify_token": encrypted_verify_token
            }
            flag_modified(existing_integration, "extra_data")
            integration = existing_integration
        else:
            # Create new integration
            integration = UserIntegration(
                user_id=user_id,
                platform="whatsapp",
                platform_user_id=phone_number_id,  # Use phone number ID as platform_user_id
                access_token=encrypted_access_token,
                extra_data={
                    "phone_number_id": phone_number_id,
                    "waba_id": waba_id,
                    "verify_token": encrypted_verify_token
                }
            )
            self.db.add(integration)
        
        await self.db.commit()
        await self.db.refresh(integration)
        return integration

    async def verify_webhook_token(self, mode: str, token: str, challenge: str) -> str:
        """Verify WhatsApp webhook using verify tokens from the database."""
        if mode != "subscribe":
            raise Exception("Invalid mode")

        # Fetch all whatsapp integrations
        result = await self.db.execute(
            select(UserIntegration).where(
                UserIntegration.platform == "whatsapp"
            )
        )
        integrations = result.scalars().all()

        for integration in integrations:
            if integration.extra_data and "verify_token" in integration.extra_data:
                try:
                    decrypted_token = self.encryption_service.decrypt(integration.extra_data["verify_token"])
                    if decrypted_token == token:
                        return challenge
                except Exception:
                    continue
        
        # Fallback to env var
        if token == settings.WA_VERIFY_TOKEN:
            return challenge

        raise Exception("Invalid verification token")

    async def handle_webhook_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming webhook events from WhatsApp."""
        print(f"Received WhatsApp webhook event: {event_data}")
        # Add your event handling logic here
        return {"status": "received", "data": event_data}
