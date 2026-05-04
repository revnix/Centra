import asyncio
from sqlalchemy import text
from src.api.db.session import engine
from sqlalchemy.orm import declarative_base

async def add_column():
    print("Checking/Adding recording_path column to interview_sessions table...")
    async with engine.begin() as conn:
        try:
           # Explicitly use text() for the raw SQL
           await conn.execute(text("SELECT recording_path FROM interview_sessions LIMIT 1"))
           print("Column 'recording_path' already exists.")
           return
        except Exception:
           pass # Column likely doesn't exist, proceed to add it

    # New transaction for adding the column
    async with engine.begin() as conn:
        print("Column not found. Adding 'recording_path' column...")
        try:
            await conn.execute(text("ALTER TABLE interview_sessions ADD COLUMN recording_path VARCHAR"))
            print("Column added successfully.")
        except Exception as e:
            print(f"Failed to add column: {e}")

if __name__ == "__main__":
    asyncio.run(add_column())
