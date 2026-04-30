import asyncio
import sys
import os

# Add the current directory to sys.path to find 'src'
sys.path.append(os.getcwd())

from src.api.db.session import AsyncSessionLocal
from src.api.models.application import Application
from sqlalchemy.future import select

async def check_apps():
    try:
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(Application.id))
            ids = res.scalars().all()
            print(f"Application IDs: {ids}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_apps())
