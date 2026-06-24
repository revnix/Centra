import httpx
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.api.models.integration import UserIntegration


class WhatsAppService:
    def __init__(self, db: AsyncSession):
        self.db = db

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
            "access_token": integration.access_token,
            "verify_token": extra_data["verify_token"],
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
        # Check if integration already exists
        existing_integration = await self.get_integration(user_id)
        
        if existing_integration:
            # Update existing integration
            existing_integration.access_token = access_token
            existing_integration.extra_data = {
                "phone_number_id": phone_number_id,
                "waba_id": waba_id,
                "verify_token": verify_token
            }
            integration = existing_integration
        else:
            # Create new integration
            integration = UserIntegration(
                user_id=user_id,
                platform="whatsapp",
                platform_user_id=phone_number_id,  # Use phone number ID as platform_user_id
                access_token=access_token,
                extra_data={
                    "phone_number_id": phone_number_id,
                    "waba_id": waba_id,
                    "verify_token": verify_token
                }
            )
            self.db.add(integration)
        
        await self.db.commit()
        await self.db.refresh(integration)
        return integration

    async def connect_via_oauth(self, user_id: int, code: str) -> UserIntegration:
        """Connect WhatsApp using Facebook OAuth authorization code.
        
        Flow:
        1. Exchange the auth code for an access token using app_id + app_secret
        2. Use the token to fetch the user's WhatsApp Business Accounts
        3. Get the phone number associated with the WABA
        4. Save credentials to DB
        """
        from src.api.core.config import settings
        
        app_id = settings.FACEBOOK_APP_ID
        app_secret = settings.FACEBOOK_APP_SECRET
        
        if not app_id or not app_secret:
            raise Exception("Facebook App ID or App Secret not configured on the server.")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Step 1: Exchange auth code for access token
            token_url = "https://graph.facebook.com/v25.0/oauth/access_token"
            token_params = {
                "client_id": app_id,
                "client_secret": app_secret,
                "code": code,
            }
            print(f"[WhatsApp OAuth] Exchanging code for token...")
            token_response = await client.get(token_url, params=token_params)
            
            if token_response.status_code != 200:
                error_detail = token_response.text
                print(f"[WhatsApp OAuth] Token exchange failed: {error_detail}")
                raise Exception(f"Failed to exchange Facebook auth code: {error_detail}")
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise Exception("No access token returned from Facebook.")
            
            print(f"[WhatsApp OAuth] Got access token successfully")
            
            # Step 2: Use the debug_token or /me/businesses to find WABA
            # First try to get shared WABA IDs from the Embedded Signup response
            waba_id = None
            phone_number_id = None
            
            # Try fetching the user's WhatsApp Business Account via Business Management API
            # The Embedded Signup flow grants the token access to the shared WABA
            debug_url = f"https://graph.facebook.com/v25.0/debug_token"
            debug_response = await client.get(debug_url, params={
                "input_token": access_token,
                "access_token": f"{app_id}|{app_secret}"
            })
            print(f"[WhatsApp OAuth] Debug token response: {debug_response.text}")
            
            if debug_response.status_code == 200:
                debug_data = debug_response.json().get("data", {})
                granular_scopes = debug_data.get("granular_scopes", [])
                for scope in granular_scopes:
                    if scope.get("permission") == "whatsapp_business_management":
                        target_ids = scope.get("target_ids", [])
                        if target_ids:
                            waba_id = target_ids[0]
                            print(f"[WhatsApp OAuth] Found WABA ID from scopes: {waba_id}")
                        break
            
            # Step 3: If we found a WABA ID, fetch phone numbers
            if waba_id:
                phones_url = f"https://graph.facebook.com/v25.0/{waba_id}/phone_numbers"
                phones_response = await client.get(phones_url, params={
                    "access_token": access_token
                })
                print(f"[WhatsApp OAuth] Phone numbers response: {phones_response.text}")
                
                if phones_response.status_code == 200:
                    phones_data = phones_response.json()
                    if phones_data.get("data") and len(phones_data["data"]) > 0:
                        phone_number_id = phones_data["data"][0]["id"]
                        print(f"[WhatsApp OAuth] Found phone number ID: {phone_number_id}")
            
            # Fallback: try /me/businesses endpoint
            if not waba_id:
                businesses_url = "https://graph.facebook.com/v25.0/me/businesses"
                biz_response = await client.get(businesses_url, params={
                    "access_token": access_token
                })
                print(f"[WhatsApp OAuth] Businesses response: {biz_response.text}")
                
                if biz_response.status_code == 200:
                    biz_data = biz_response.json()
                    if biz_data.get("data") and len(biz_data["data"]) > 0:
                        business_id = biz_data["data"][0]["id"]
                        
                        # Get WABA from business
                        waba_url = f"https://graph.facebook.com/v25.0/{business_id}/owned_whatsapp_business_accounts"
                        waba_response = await client.get(waba_url, params={
                            "access_token": access_token
                        })
                        print(f"[WhatsApp OAuth] WABA response: {waba_response.text}")
                        
                        if waba_response.status_code == 200:
                            waba_data = waba_response.json()
                            if waba_data.get("data") and len(waba_data["data"]) > 0:
                                waba_id = waba_data["data"][0]["id"]
                                
                                # Get phone numbers from WABA
                                phones_url = f"https://graph.facebook.com/v25.0/{waba_id}/phone_numbers"
                                phones_response = await client.get(phones_url, params={
                                    "access_token": access_token
                                })
                                if phones_response.status_code == 200:
                                    phones_data = phones_response.json()
                                    if phones_data.get("data") and len(phones_data["data"]) > 0:
                                        phone_number_id = phones_data["data"][0]["id"]
            
            if not waba_id or not phone_number_id:
                print(f"[WhatsApp OAuth] Could not find WABA or phone. waba_id={waba_id}, phone_number_id={phone_number_id}")
                raise Exception(
                    "Could not find your WhatsApp Business Account or phone number. "
                    "Please make sure you completed the Embedded Signup flow and selected a phone number."
                )
        
        verify_token = f"auto_verify_{user_id}"
        
        return await self.connect(
            user_id=user_id,
            phone_number_id=phone_number_id,
            waba_id=waba_id,
            access_token=access_token,
            verify_token=verify_token
        )

    def verify_webhook(self, verify_token_from_user: str, mode: str, token: str, challenge: str) -> str:
        """Verify WhatsApp webhook using stored verify token."""
        if mode == "subscribe" and token == verify_token_from_user:
            return challenge
        raise Exception("Invalid verification token")

    async def handle_webhook_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming webhook events from WhatsApp."""
        print(f"Received WhatsApp webhook event: {event_data}")
        # Add your event handling logic here
        return {"status": "received", "data": event_data}
