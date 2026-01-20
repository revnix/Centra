import asyncio
from sqlalchemy.future import select
from src.api.db.session import AsyncSessionLocal
from src.api.models.user import User

async def list_users():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        print(f"Found {len(users)} users:")
        for user in users:
            print(f"ID: {user.id}, Email: {user.email}")

if __name__ == "__main__":
    asyncio.run(list_users())
