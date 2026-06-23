import httpx
from typing import Dict, Any
from src.api.core.config import settings


class WhatsAppService:
    def __init__(self):
        self.phone_number_id = settings.WA_PHONE_NUMBER_ID
        self.waba_id = settings.WA_WABA_ID
        self.access_token = settings.WA_ACCESS_TOKEN
        self.verify_token = settings.WA_VERIFY_TOKEN
        self.graph_api_url = settings.WA_GRAPH_API_URL

    def is_connected(self) -> bool:
        """Check if WhatsApp credentials are configured."""
        return all([
            self.phone_number_id,
            self.waba_id,
            self.access_token,
            self.verify_token
        ])

    def get_headers(self) -> Dict[str, str]:
        """Get authorization headers for WhatsApp API."""
        return {
            "Authorization": f"Bearer {self.access_token}",
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

    async def send_text_message(self, to: str, message: str) -> Dict[str, Any]:
        """Send a text message to a WhatsApp number."""
        if not self.is_connected():
            raise Exception("WhatsApp integration not configured")

        # Normalize the phone number
        normalized_to = self._normalize_phone_number(to)
        
        url = f"{self.graph_api_url}/{self.phone_number_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": normalized_to,
            "text": {"body": message}
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=self.get_headers(), json=payload)
            response.raise_for_status()
            return response.json()

    async def send_template_message(
        self,
        to: str,
        template_name: str,
        language_code: str = "en_US",
        components: list = []
    ) -> Dict[str, Any]:
        """Send a template message to a WhatsApp number."""
        if not self.is_connected():
            raise Exception("WhatsApp integration not configured")

        # Normalize the phone number
        normalized_to = self._normalize_phone_number(to)
        
        url = f"{self.graph_api_url}/{self.phone_number_id}/messages"
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
            response = await client.post(url, headers=self.get_headers(), json=payload)
            response.raise_for_status()
            return response.json()

    def verify_webhook(self, mode: str, token: str, challenge: str) -> str:
        """Verify WhatsApp webhook."""
        if mode == "subscribe" and token == self.verify_token:
            return challenge
        raise Exception("Invalid verification token")

    async def handle_webhook_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming webhook events from WhatsApp."""
        print(f"Received WhatsApp webhook event: {event_data}")
        # Add your event handling logic here
        return {"status": "received", "data": event_data}
