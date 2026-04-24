import sys
import os
import asyncio

# Add project root to sys.path
sys.path.append(os.getcwd())

import logging
logging.basicConfig(level=logging.INFO)
from src.api.db.session import AsyncSessionLocal
from src.api.models.application import Application, ApplicationStatus
from src.api.utils.application_handler import handle_new_application
from sqlalchemy.future import select

async def test_full_handler():
    async with AsyncSessionLocal() as db:
        print("Testing full application handler logic...")
        
        # Find a real application to test with
        result = await db.execute(select(Application).limit(1))
        app = result.scalars().first()
        
        if not app:
            print("No applications found in DB to test with. Run seed_db.py first.")
            return

        print(f"Using App ID: {app.id}")
        
        # Trigger hander
        await handle_new_application(db, app.id)
        print("Handler execution finished. Check logs above.")

if __name__ == "__main__":
    asyncio.run(test_full_handler())
