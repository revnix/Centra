import httpx
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from src.api.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.models.integration import UserIntegration
from sqlalchemy.future import select

class LinkedInService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client_id = settings.LINKEDIN_CLIENT_ID
        self.client_secret = settings.LINKEDIN_CLIENT_SECRET
        self.redirect_uri = settings.LINKEDIN_REDIRECT_URI

    def get_authorization_url(self, state: str) -> str:
        """Generate the LinkedIn authorization URL."""
        from urllib.parse import urlencode
        base_url = "https://www.linkedin.com/oauth/v2/authorization"
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "state": state,
            "scope": "openid profile email w_member_social",
        }
        return f"{base_url}?{urlencode(params)}"

    async def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for an access token."""
        url = "https://www.linkedin.com/oauth/v2/accessToken"
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data)
            response.raise_for_status()
            return response.json()

    async def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        """Fetch user profile to get the URN (sub)."""
        # Using OpenID Connect userinfo endpoint to get the sub (URN)
        url = "https://api.linkedin.com/v2/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()

    async def save_integration(
        self, 
        user_id: int, 
        token_data: Dict[str, Any], 
        profile_data: Dict[str, Any]
    ) -> UserIntegration:
        """Save or update LinkedIn integration for a user."""
        access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in")
        refresh_token = token_data.get("refresh_token")
        
        # LinkedIn URN is usually in 'sub' for OpenID Connect
        platform_user_id = profile_data.get("sub") 
        
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in) if expires_in else None

        # Check for existing integration
        result = await self.db.execute(
            select(UserIntegration).where(
                UserIntegration.user_id == user_id,
                UserIntegration.platform == "linkedin"
            )
        )
        integration = result.scalars().first()

        if integration:
            integration.access_token = access_token
            integration.refresh_token = refresh_token
            integration.expires_at = expires_at
            integration.platform_user_id = platform_user_id
        else:
            integration = UserIntegration(
                user_id=user_id,
                platform="linkedin",
                platform_user_id=platform_user_id,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at
            )
            self.db.add(integration)

        await self.db.commit()
        await self.db.refresh(integration)
        return integration

    async def post_to_linkedin(self, user_id: int, text: str) -> Dict[str, Any]:
        """Post a message to LinkedIn."""
        result = await self.db.execute(
            select(UserIntegration).where(
                UserIntegration.user_id == user_id,
                UserIntegration.platform == "linkedin"
            )
        )
        integration = result.scalars().first()
        if not integration:
            raise Exception("LinkedIn integration not found for user")

        url = "https://api.linkedin.com/v2/ugcPosts"
        headers = {
            "Authorization": f"Bearer {integration.access_token}",
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json",
        }
        
        # LinkedIn URN should be stored as 'person:URN' or similar
        # For member social, it's usually urn:li:person:<id>
        author = f"urn:li:person:{integration.platform_user_id}"
        
        payload = {
            "author": author,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {
                        "text": text
                    },
                    "shareMediaCategory": "NONE"
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
