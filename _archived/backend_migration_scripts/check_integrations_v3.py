import asyncio
import sys
from sqlalchemy.future import select
from src.api.db.session import engine, AsyncSessionLocal
from src.api.models.integration import UserIntegration
from src.api.models.user import User

async def check_db_integrations():
    print("Connecting to database...")
    async with AsyncSessionLocal() as session:
        print("Session opened. Fetching integrations...")
        result = await session.execute(select(UserIntegration))
        integrations = result.scalars().all()
        print(f"Total integrations in DB: {len(integrations)}")
        for i in integrations:
            print(f"INTEGRATION - ID: {i.id}, UserID: {i.user_id}, Platform: {i.platform}, PlatformUserID: {i.platform_user_id}")
            
            # Fetch user details
            u_result = await session.execute(select(User).where(User.id == i.user_id))
            u = u_result.scalar_one_or_none()
            if u:
                print(f"  Owner: {u.email} (ID: {u.id})")
            else:
                print(f"  Owner: NOT FOUND (ID: {i.user_id})")
        
        sys.stdout.flush()

if __name__ == "__main__":
    asyncio.run(check_db_integrations())
