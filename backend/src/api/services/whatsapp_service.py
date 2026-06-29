import json
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

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _load(self, integration: UserIntegration) -> dict:
        """Parse the JSON stored in access_token."""
        try:
            return json.loads(str(integration.access_token))
        except Exception:
            return {}

    async def get_integration(self, user_id: Any) -> Optional[UserIntegration]:
        result = await self.db.execute(
            select(UserIntegration).where(
                UserIntegration.user_id == user_id,
                UserIntegration.platform == "whatsapp",
            )
        )
        return result.scalars().first()

    async def is_connected(self, user_id: Any) -> bool:
        integration = await self.get_integration(user_id)
        if not integration:
            return False
        data = self._load(integration)
        return all([
            data.get("access_token"),
            data.get("phone_number_id"),
            data.get("waba_id"),
            data.get("verify_token"),
        ])

    async def get_credentials(self, user_id: Any) -> Dict[str, str]:
        integration = await self.get_integration(user_id)
        if not integration:
            raise Exception("WhatsApp integration not configured")
        data = self._load(integration)
        if not data.get("access_token"):
            raise Exception("WhatsApp integration not configured")
        return {
            "phone_number_id": data["phone_number_id"],
            "waba_id": data["waba_id"],
            "access_token": self.encryption_service.decrypt(data["access_token"]),
            "verify_token": self.encryption_service.decrypt(data["verify_token"]),
            "graph_api_url": "https://graph.facebook.com/v25.0",
        }

    def get_headers(self, access_token: str) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    def _normalize_phone_number(self, phone: str) -> str:
        cleaned = "".join(c for c in phone if c.isdigit())
        if not cleaned:
            raise ValueError("Invalid phone number: no digits found")
        if cleaned.startswith("0"):
            cleaned = "92" + cleaned[1:]
        return cleaned

    # ------------------------------------------------------------------
    # Public actions
    # ------------------------------------------------------------------

    async def connect(
        self,
        user_id: Any,
        phone_number_id: str,
        waba_id: str,
        access_token: str,
        verify_token: str,
    ) -> UserIntegration:
        token_json = json.dumps({
            "access_token": self.encryption_service.encrypt(access_token),
            "phone_number_id": phone_number_id,
            "waba_id": waba_id,
            "verify_token": self.encryption_service.encrypt(verify_token),
        })

        existing = await self.get_integration(user_id)
        if existing:
            existing.access_token = token_json  # type: ignore[assignment]
            existing.platform_user_id = phone_number_id  # type: ignore[assignment]
            integration = existing
        else:
            integration = UserIntegration(
                user_id=user_id,
                platform="whatsapp",
                platform_user_id=phone_number_id,
                access_token=token_json,
            )
            self.db.add(integration)

        await self.db.commit()
        await self.db.refresh(integration)
        return integration

    async def send_text_message(self, user_id: Any, to: str, message: str) -> Dict[str, Any]:
        credentials = await self.get_credentials(user_id)
        normalized_to = self._normalize_phone_number(to)
        url = f"{credentials['graph_api_url']}/{credentials['phone_number_id']}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": normalized_to,
            "text": {"body": message},
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                headers=self.get_headers(credentials["access_token"]),
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def send_template_message(
        self,
        user_id: Any,
        to: str,
        template_name: str,
        language_code: str = "en_US",
        components: list = [],
    ) -> Dict[str, Any]:
        credentials = await self.get_credentials(user_id)
        normalized_to = self._normalize_phone_number(to)
        url = f"{credentials['graph_api_url']}/{credentials['phone_number_id']}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": normalized_to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": components,
            },
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                headers=self.get_headers(credentials["access_token"]),
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def verify_webhook_token(self, mode: str, token: str, challenge: str) -> str:
        if mode != "subscribe":
            raise Exception("Invalid mode")

        result = await self.db.execute(
            select(UserIntegration).where(UserIntegration.platform == "whatsapp")
        )
        for integration in result.scalars().all():
            data = self._load(integration)
            if data.get("verify_token"):
                try:
                    if self.encryption_service.decrypt(data["verify_token"]) == token:
                        return challenge
                except Exception:
                    continue

        if token == settings.WA_VERIFY_TOKEN:
            return challenge

        raise Exception("Invalid verification token")

    async def handle_webhook_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        return {"status": "received", "data": event_data}
