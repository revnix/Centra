"""One-time migration: convert applications.status from PG enum to VARCHAR(50).

The PG enum type required an ALTER TYPE migration for every new status value,
and any mismatch crashed all application endpoints. Validation now lives in
the Python ApplicationStatus enum (see models/application.py _LenientEnum).
"""
import asyncio
import os
import ssl
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")


async def migrate():
    import asyncpg

    url = DATABASE_URL
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if "?" in url:
        url = url.split("?")[0]

    ssl_ctx = ssl.create_default_context()
    conn = await asyncpg.connect(url, ssl=ssl_ctx, statement_cache_size=0)

    try:
        col_type = await conn.fetchval(
            """
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'applications' AND column_name = 'status'
            """
        )
        print(f"Current column type: {col_type}")

        if col_type == "USER-DEFINED":
            await conn.execute(
                "ALTER TABLE applications ALTER COLUMN status TYPE VARCHAR(50) USING status::text"
            )
            print("Converted applications.status: enum -> VARCHAR(50)")
        else:
            print("Column is already VARCHAR. Nothing to do.")

        rows = await conn.fetch(
            "SELECT status, count(*) AS n FROM applications GROUP BY status ORDER BY n DESC"
        )
        print("\nStatus distribution after migration:")
        for r in rows:
            print(f"  {r['status']}: {r['n']}")
    finally:
        await conn.close()


asyncio.run(migrate())
