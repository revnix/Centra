import asyncio
from sqlalchemy import select
from src.api.db.session import AsyncSessionLocal
from src.api.models.user import User

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Username: {u.username} | Role: {u.role}")

if __name__ == "__main__":
    asyncio.run(main())
