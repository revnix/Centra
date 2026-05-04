import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def update_schema():
    async with engine.begin() as conn:
        print("Adding full_name column to users table...")
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR"))
            print("Successfully added full_name column.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(update_schema())
