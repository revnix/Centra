import asyncio
import os
import sys

# Add the current directory to sys.path to allow imports from src
sys.path.append(os.getcwd())

from src.api.db.session import AsyncSessionLocal
from src.api.models.application import Application
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Application).order_by(Application.created_at.desc()).limit(10))
        apps = res.scalars().all()
        print(f"{'ID':<5} | {'Status':<20} | {'Score':<10} | {'Email Status':<15}")
        print("-" * 60)
        for a in apps:
            print(f"{a.id:<5} | {str(a.status):<20} | {str(a.match_score):<10} | {str(a.email_delivery_status):<15}")

if __name__ == "__main__":
    asyncio.run(check())
