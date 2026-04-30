import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def update_schema():
    async with engine.begin() as conn:
        print("Adding source column to applications table...")
        try:
            # Add source column with default 'web'
            await conn.execute(text("ALTER TABLE applications ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'web'"))
            # Update existing records to 'web' just in case
            await conn.execute(text("UPDATE applications SET source = 'web' WHERE source IS NULL"))
            print("Successfully added and initialized source column.")
        except Exception as e:
            print(f"Error adding source column: {e}")

        print("Checking for other missing columns...")
        try:
             await conn.execute(text("ALTER TABLE applications ADD COLUMN IF NOT EXISTS email_delivery_status VARCHAR(50) DEFAULT 'PENDING'"))
             await conn.execute(text("ALTER TABLE applications ADD COLUMN IF NOT EXISTS email_logs TEXT"))
             print("Successfully synchronized application email columns.")
        except Exception as e:
            print(f"Error adding email columns: {e}")

if __name__ == "__main__":
    asyncio.run(update_schema())
