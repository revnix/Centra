import logging
import httpx
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from src.api.models.job import Posts
from src.api.core.config import settings
from src.api.models.integration import UserIntegration
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

logger = logging.getLogger(__name__)

class IndeedService:
    """
    Service to handle job uploads to the Indeed platform using Job Sync API (GraphQL).
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.base_url = settings.INDEED_API_ENDPOINT
        self.token_url = settings.INDEED_TOKEN_URL

    async def get_integration(self, user_id: int) -> Optional[UserIntegration]:
        """Fetch Indeed integration for a user."""
        result = await self.db.execute(
            select(UserIntegration).where(
                UserIntegration.user_id == user_id,
                UserIntegration.platform == "indeed"
            )
        )
        return result.scalars().first()

    async def get_valid_token(self, integration: UserIntegration) -> str:
        """Get a valid access token, refreshing if necessary."""
        if integration.expires_at and integration.expires_at > datetime.now():
            return integration.access_token

        # Refresh token logic
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": integration.refresh_token,
                    "client_id": settings.INDEED_CLIENT_ID,
                    "client_secret": settings.INDEED_CLIENT_SECRET,
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to refresh Indeed token: {response.text}")
                raise Exception("Indeed authentication failed")

            data = response.json()
            integration.access_token = data["access_token"]
            if "refresh_token" in data:
                integration.refresh_token = data["refresh_token"]
            
            expires_in = data.get("expires_in", 3600)
            integration.expires_at = datetime.now() + timedelta(seconds=expires_in)
            
            await self.db.commit()
            return integration.access_token

    async def upload_job(self, job: Posts, user_id: int) -> bool:
        """
        Uploads a job listing to Indeed via GraphQL API.
        """
        integration = await self.get_integration(user_id)
        if not integration:
            logger.warning(f"No Indeed integration found for user {user_id}")
            return False

        try:
            token = await self.get_valid_token(integration)
            
            # Simplified GraphQL mutation for job creation/update
            query = """
            mutation CreateSourcedJob($input: SourcedJobPostingBodyInput!) {
              jobsIngest {
                createSourcedJobPostings(input: [$input]) {
                  jobPostings {
                    externalId
                    success
                  }
                }
              }
            }
            """
            
            variables = {
                "input": {
                    "externalId": str(job.id),
                    "title": job.title,
                    "description": job.description,  # Indeed expects HTML
                    "company": job.company_name or settings.APP_NAME,
                    "location": job.location,
                    "jobType": job.job_type.value if job.job_type else "FULL_TIME",
                    "employerId": settings.INDEED_EMPLOYER_ID,
                    # Add more fields based on Indeed schema
                }
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/graphql",
                    json={"query": query, "variables": variables},
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                if response.status_code != 200:
                    logger.error(f"Indeed API error: {response.text}")
                    return False
                
                res_data = response.json()
                # Check for GraphQL errors
                if "errors" in res_data:
                    logger.error(f"Indeed GraphQL error: {res_data['errors']}")
                    return False
                
                logger.info(f"Successfully synced job {job.id} to Indeed.")
                return True

        except Exception as e:
            logger.error(f"Failed to upload job {job.id} to Indeed: {str(e)}")
            return False

    async def expire_job(self, job: Posts, user_id: int) -> bool:
        """Marks a job as expired on Indeed."""
        integration = await self.get_integration(user_id)
        if not integration: return False

        try:
            token = await self.get_valid_token(integration)
            query = """
            mutation ExpireSourcedJob($externalId: String!) {
              jobsIngest {
                expireSourcedJobPostings(externalIds: [$externalId]) {
                  jobPostings {
                    externalId
                    success
                  }
                }
              }
            }
            """
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{self.base_url}/graphql",
                    json={"query": query, "variables": {"externalId": str(job.id)}},
                    headers={"Authorization": f"Bearer {token}"}
                )
            return True
        except Exception:
            return False
