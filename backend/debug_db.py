import asyncio
import sys
from sqlalchemy.future import select
from src.api.db.session import engine, AsyncSessionLocal
from src.api.models.integration import UserIntegration
from src.api.models.user import User

async def check_db_integrations():
    print("STARTING SCRIPT", flush=True)
    try:
        async with AsyncSessionLocal() as session:
            print("SESSION OPENED", flush=True)
            result = await session.execute(select(UserIntegration))
            integrations = result.scalars().all()
            print(f"COUNT: {len(integrations)}", flush=True)
            for i in integrations:
                print(f"INTEGRATION: id={i.id}, user_id={i.user_id}, platform={i.platform}", flush=True)
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
    print("FINISHED", flush=True)

if __name__ == "__main__":
    asyncio.run(check_db_integrations())
