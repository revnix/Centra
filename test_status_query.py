import asyncio
from sqlalchemy.future import select
from src.api.db.session import AsyncSessionLocal
from src.api.models.integration import UserIntegration
from src.api.models.user import User

async def test_status():
    async with AsyncSessionLocal() as db:
        try:
            # Let's try to find any user first
            user_result = await db.execute(select(User).limit(1))
            user = user_result.scalars().first()
            
            if not user:
                print("No user found in DB")
                return

            print(f"Testing status for user_id={user.id}")
            
            result = await db.execute(
                select(UserIntegration).where(
                    UserIntegration.user_id == user.id,
                    UserIntegration.platform == "linkedin"
                )
            )
            integration = result.scalars().first()
            print(f"Integration found: {integration is not None}")
            
        except Exception as e:
            print(f"FAILED: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_status())
