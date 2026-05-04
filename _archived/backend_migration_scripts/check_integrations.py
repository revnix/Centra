import asyncio
from sqlalchemy.future import select
from src.api.db.session import engine
from src.api.models.integration import UserIntegration

async def check_db_integrations():
    async with engine.connect() as conn:
        result = await conn.execute(select(UserIntegration))
        integrations = result.fetchall()
        print(f"Total integrations in DB: {len(integrations)}")
        for i in integrations:
            print(f"ID: {i.id}, UserID: {i.user_id}, Platform: {i.platform}, PlatformUserID: {i.platform_user_id}")

if __name__ == "__main__":
    asyncio.run(check_db_integrations())
