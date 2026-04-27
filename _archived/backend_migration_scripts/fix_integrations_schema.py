import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def update_schema():
    async with engine.begin() as conn:
        print("Adding platform_user_id column to user_integrations table...")
        try:
            await conn.execute(text("ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS platform_user_id VARCHAR"))
            print("Successfully added platform_user_id column.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(update_schema())
