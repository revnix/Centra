
import asyncio
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.api.db.session import AsyncSessionLocal
from src.api.models.application import Application
from src.api.models.user import User
from src.api.models.job import Posts

async def test_query():
    async with AsyncSessionLocal() as session:
        print("Checking users...")
        users = (await session.execute(select(User))).scalars().all()
        for u in users:
            print(f"User: {u.email} (Username: {u.username}, Role: {u.role})")
        return

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_query())
