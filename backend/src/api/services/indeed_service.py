import httpx
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from src.api.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.models.integration import UserIntegration
from sqlalchemy.future import select

class IndeedService:
    """
    Service for handling Indeed OAuth2 authentication and job posting.
    
    This service manages:
    - OAuth2 authorization flow (generating auth URLs, exchanging codes for tokens)
    - User profile retrieval from Indeed
    - Storing/updating integration credentials in the database
    - Posting jobs to Indeed via their API
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client_id = settings.INDEED_CLIENT_ID
        self.client_secret = settings.INDEED_CLIENT_SECRET
        self.redirect_uri = settings.INDEED_REDIRECT_URI

    def get_authorization_url(self, state: str) -> str:
        """
        Generate the Indeed OAuth2 authorization URL.
        
        Args:
            state: A random string for CSRF protection
            
        Returns:
            The full authorization URL to redirect the user to
        """
        from urllib.parse import urlencode
        base_url = "https://secure.indeed.com/oauth/v2/authorize"
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "state": state,
            "scope": "employer_access",  # Indeed scope for employer features
        }
        return f"{base_url}?{urlencode(params)}"

    async def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """
        Exchange the authorization code for an access token.
        
        Args:
            code: The authorization code received from Indeed callback
            
        Returns:
            Dictionary containing access_token, refresh_token, expires_in, etc.
        """
        url = "https://apis.indeed.com/oauth/v2/tokens"
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand)";v="24", "Google Chrome";v="122"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data, headers=headers)
            response.raise_for_status()
            return response.json()

    async def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        """
        Fetch the employer profile from Indeed.
        
        Args:
            access_token: The OAuth access token
            
        Returns:
            Dictionary containing employer profile information
        """
        async with httpx.AsyncClient() as client:
            # Try /v1/employers/me first
            url_me = f"{settings.INDEED_API_ENDPOINT}/v1/employers/me"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            }
            try:
                response = await client.get(url_me, headers=headers)
                if response.status_code == 200:
                    return response.json()
            except Exception as e:
                print(f"DEBUG: Indeed /v1/employers/me failed: {e}")

            # If /me fails, try listing all employers
            url_list = f"{settings.INDEED_API_ENDPOINT}/v1/employers"
            try:
                response = await client.get(url_list, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    # If it's a list, take the first one
                    if isinstance(data, list) and len(data) > 0:
                        return data[0]
                    # If it's a dict with a list (sometimes Indeed wraps it)
                    if isinstance(data, dict) and "employers" in data:
                        employers = data["employers"]
                        if isinstance(employers, list) and len(employers) > 0:
                            return employers[0]
            except Exception as e:
                print(f"DEBUG: Indeed /v1/employers failed: {e}")

            # Fallback: return a placeholder if we can't get any profile
            # This allows the integration to proceed even if profile retrieval fails
            return {
                "id": "unknown_employer",
                "name": "Indeed Employer",
                "is_placeholder": True
            }

    async def save_integration(
        self, 
        user_id: int, 
        token_data: Dict[str, Any], 
        profile_data: Dict[str, Any]
    ) -> UserIntegration:
        """
        Save or update Indeed integration credentials for a user.
        
        Args:
            user_id: The ID of the user
            token_data: OAuth token information (access_token, refresh_token, expires_in)
            profile_data: Indeed employer profile data
            
        Returns:
            The created or updated UserIntegration object
        """
        access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in")
        refresh_token = token_data.get("refresh_token")
        
        # Indeed employer ID
        platform_user_id = profile_data.get("id") or profile_data.get("employer_id")
        
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in) if expires_in else None

        # Check for existing integration
        result = await self.db.execute(
            select(UserIntegration).where(
                UserIntegration.user_id == user_id,
                UserIntegration.platform == "indeed"
            )
        )
        integration = result.scalars().first()

        if integration:
            # Update existing integration
            integration.access_token = access_token
            integration.refresh_token = refresh_token
            integration.expires_at = expires_at
            integration.platform_user_id = platform_user_id
        else:
            # Create new integration
            integration = UserIntegration(
                user_id=user_id,
                platform="indeed",
                platform_user_id=platform_user_id,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at
            )
            self.db.add(integration)

        await self.db.commit()
        await self.db.refresh(integration)
        return integration

    async def post_job_to_indeed(
        self, 
        user_id: int, 
        title: str, 
        description: str, 
        location: str,
        company: str
    ) -> Dict[str, Any]:
        """
        Post a job to Indeed.
        
        Args:
            user_id: The ID of the user posting the job
            title: Job title
            description: Job description
            location: Job location
            company: Company name
            
        Returns:
            Response from Indeed API containing job posting details
        """
        # Get the user's Indeed integration
        result = await self.db.execute(
            select(UserIntegration).where(
                UserIntegration.user_id == user_id,
                UserIntegration.platform == "indeed"
            )
        )
        integration = result.scalars().first()
        if not integration:
            raise Exception("Indeed integration not found for user")

        # Indeed Job Posting API endpoint
        url = f"{settings.INDEED_API_ENDPOINT}/v1/jobs"
        headers = {
            "Authorization": f"Bearer {integration.access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
        
        payload = {
            "title": title,
            "description": description,
            "location": location,
            "company": company,
            "jobType": "FULL_TIME",  # Default, can be parameterized
            "postingStatus": "ACTIVE"
        }

        # Try using http2=True if installed, otherwise it falls back (httpx default behavior is http1 without the extra package)
        # But we can try to make the client as standard as possible.
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            max_retries = 3
            retry_delay = 2  # Start with 2 seconds
            
            for attempt in range(max_retries):
                try:
                    print(f"DEBUG: Posting job to Indeed API (Attempt {attempt + 1}/{max_retries}). URL: {url}")
                    response = await client.post(url, headers=headers, json=payload)
                    print(f"DEBUG: Indeed API response status: {response.status_code}")
                    
                    if response.status_code == 200 or response.status_code == 201:
                        return response.json()
                    
                    # Check for Cloudflare block
                    if "text/html" in response.headers.get("content-type", ""):
                        print(f"DEBUG: Indeed API returned HTML (likely Cloudflare block) on attempt {attempt + 1}")
                        if attempt < max_retries - 1:
                            # Wait before retrying
                            import asyncio
                            import random
                            wait_time = retry_delay * (2 ** attempt) + random.uniform(0, 1)
                            print(f"DEBUG: Waiting {wait_time:.2f} seconds before retry...")
                            await asyncio.sleep(wait_time)
                            continue
                        else:
                            raise Exception("Indeed API is blocking the request (Cloudflare). Please try again later or contact Indeed support to verify your API access.")
                    
                    # Other errors
                    print(f"DEBUG: Indeed API error response: {response.status_code}")
                    print(f"DEBUG: Indeed API error details: {response.text}")
                    response.raise_for_status()
                    
                except httpx.HTTPStatusError as e:
                    if "text/html" in e.response.headers.get("content-type", ""):
                        if attempt < max_retries - 1:
                            import asyncio
                            import random
                            wait_time = retry_delay * (2 ** attempt) + random.uniform(0, 1)
                            print(f"DEBUG: Cloudflare block detected. Retrying in {wait_time:.2f} seconds...")
                            await asyncio.sleep(wait_time)
                            continue
                        raise Exception("Indeed API access blocked by Cloudflare. This may indicate that your IP is rate-limited or your API credentials need verification. Please contact Indeed support.")
                    raise Exception(f"Indeed API error: {e.response.text}")
                except httpx.TimeoutException:
                    if attempt < max_retries - 1:
                        import asyncio
                        wait_time = retry_delay * (2 ** attempt)
                        print(f"DEBUG: Request timeout. Retrying in {wait_time:.2f} seconds...")
                        await asyncio.sleep(wait_time)
                        continue
                    raise Exception("Indeed API request timed out. Please try again later.")
                except Exception as e:
                    print(f"DEBUG: Indeed API unexpected error: {e}")
                    if attempt < max_retries - 1:
                        import asyncio
                        wait_time = retry_delay * (2 ** attempt)
                        print(f"DEBUG: Retrying in {wait_time:.2f} seconds...")
                        await asyncio.sleep(wait_time)
                        continue
                    raise e
            
            # If we get here, all retries failed
            raise Exception("Failed to post job to Indeed after multiple attempts. Please try again later.")
