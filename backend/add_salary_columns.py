"""
Migration: Add expected_salary and salary_filter_status to the applications table.
Run once: python add_salary_columns.py
"""
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

# asyncpg needs the plain postgresql:// scheme, not postgresql+asyncpg://
ASYNCPG_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

SQL = """
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS expected_salary FLOAT,
    ADD COLUMN IF NOT EXISTS salary_filter_status VARCHAR(50);
"""

async def run():
    import asyncpg
    conn = await asyncpg.connect(ASYNCPG_URL)
    try:
        await conn.execute(SQL)
        print("Migration complete: expected_salary and salary_filter_status columns added.")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run())
