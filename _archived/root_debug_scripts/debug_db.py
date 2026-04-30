import asyncio
from sqlalchemy.future import select
from src.api.db.session import engine, async_session_factory
from src.api.models.integration import UserIntegration
from src.api.models.user import User

async def test_query():
    async with async_session_factory() as db:
        try:
            # Try to fetch ANY integration to see if it even works
            result = await db.execute(select(UserIntegration))
            integration = result.scalars().first()
            print(f"Success! Integration found: {integration.id if integration else 'None'}")
        except Exception as e:
            print(f"FAILED: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_query())
