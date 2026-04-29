import asyncio
from src.api.db.session import AsyncSessionLocal
from src.api.services.linkedin_service import LinkedInService
import httpx

async def main():
    async with AsyncSessionLocal() as session:
        linkedin_service = LinkedInService(session)
        # Try to post for user_id = 1 (or the first user with an integration)
        from src.api.models.integration import UserIntegration
        from sqlalchemy.future import select
        
        result = await session.execute(select(UserIntegration).where(UserIntegration.platform == "linkedin"))
        integration = result.scalars().first()
        
        if not integration:
            print("No linkedin integration found in DB.")
            return
            
        print(f"Found integration for user {integration.user_id}, platform_user_id: {integration.platform_user_id}")
        
        # Try to run post_to_linkedin and catch the error
        try:
            res = await linkedin_service.post_to_linkedin(
                user_id=integration.user_id,
                text="Testing LinkedIn integration from API.",
                article_url="https://example.com"
            )
            print("Success:", res)
        except httpx.HTTPStatusError as e:
            print("HTTP Error:", e.response.status_code)
            print("Error details:", e.response.text)
        except Exception as e:
            print("Other Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
