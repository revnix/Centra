"""
Adds any missing values to the PostgreSQL applicationstatus enum.
Safe to run multiple times (ALTER TYPE ... ADD VALUE IF NOT EXISTS).
"""
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("+asyncpg", "")
print(f"Connecting to: {DATABASE_URL.split('@')[-1]}")

# All values the ApplicationStatus Python enum expects (in definition order)
WANTED = [
    "APPLIED",
    "SCREENING",
    "SHORTLISTED",
    "INTERVIEW_INVITED",
    "INTERVIEW_PENDING",
    "INTERVIEW_IN_PROGRESS",
    "INTERVIEW_COMPLETED",
    "OFFER",
    "REJECTED",
    "HIRED",
    "ONBOARDING",
    "WITHDRAWN",
]


async def fix():
    conn = await asyncpg.connect(DATABASE_URL, ssl="require")
    try:
        rows = await conn.fetch(
            """
            SELECT enumlabel
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'applicationstatus'
            ORDER BY e.enumsortorder
            """
        )
        existing = {r["enumlabel"] for r in rows}
        print(f"Current enum values in DB: {sorted(existing)}")

        for val in WANTED:
            if val not in existing:
                await conn.execute(
                    f"ALTER TYPE applicationstatus ADD VALUE IF NOT EXISTS '{val}'"
                )
                print(f"  [ADDED] {val}")
            else:
                print(f"  [OK]    {val}")

        print("\nDone - all applicationstatus values are present.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(fix())
