"""One-time migration: add missing ApplicationStatus enum values to Neon PostgreSQL."""
import asyncio
import os
import ssl
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

async def fix_enum():
    import asyncpg

    url = DATABASE_URL
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if "?" in url:
        url = url.split("?")[0]

    ssl_ctx = ssl.create_default_context()

    conn = await asyncpg.connect(url, ssl=ssl_ctx, statement_cache_size=0)

    new_values = [
        "SCREENING_TEST",
        "INTERVIEW_SCHEDULED",
        "REFERENCE_CHECK",
        "OFFER_EXTENDED",
        "OFFER_ACCEPTED",
        "INTERVIEW_IN_PROGRESS",
        "INTERVIEW_COMPLETED",
    ]

    try:
        for val in new_values:
            try:
                await conn.execute(f"ALTER TYPE applicationstatus ADD VALUE IF NOT EXISTS '{val}'")
                print(f"  Added: {val}")
            except Exception as e:
                print(f"  Skip {val}: {e}")

        result = await conn.fetch("SELECT unnest(enum_range(NULL::applicationstatus))::text AS val")
        print("\nCurrent enum values:")
        for row in result:
            print(f"  {row['val']}")
    finally:
        await conn.close()

asyncio.run(fix_enum())
