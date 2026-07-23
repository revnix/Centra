"""One-time cleanup: repair corrupted application.status values in Neon PostgreSQL.

Some rows have email-delivery values (e.g. 'SENT') stored in the status column.
Maps known-bad values to sensible statuses and reports anything else unknown.
"""
import asyncio
import os
import ssl
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

VALID = {
    "APPLIED", "SCREENING", "SCREENING_TEST", "SHORTLISTED",
    "INTERVIEW_SCHEDULED", "INTERVIEW_INVITED", "RESPONDED",
    "INTERVIEW_PENDING", "INTERVIEW_IN_PROGRESS", "INTERVIEW_COMPLETED",
    "REJECTED", "REFERENCE_CHECK", "OFFER_EXTENDED", "OFFER",
    "OFFER_ACCEPTED", "ONBOARDING", "HIRED", "WITHDRAWN",
}

# Known-bad value → replacement
REMAP = {
    "SENT": "INTERVIEW_INVITED",   # email status accidentally written to status column
    "FAILED": "APPLIED",
    "PENDING": "APPLIED",
    "DELIVERED": "INTERVIEW_INVITED",
    "OPENED": "INTERVIEW_INVITED",
    "NOT_RESPONDED": "INTERVIEW_INVITED",
    "DECLINED": "REJECTED",
}


async def fix():
    import asyncpg

    url = DATABASE_URL
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if "?" in url:
        url = url.split("?")[0]

    ssl_ctx = ssl.create_default_context()
    conn = await asyncpg.connect(url, ssl=ssl_ctx, statement_cache_size=0)

    try:
        rows = await conn.fetch(
            "SELECT status::text AS s, count(*) AS n FROM applications GROUP BY status::text ORDER BY n DESC"
        )
        print("Current status distribution:")
        bad = []
        for r in rows:
            marker = "" if r["s"] in VALID else "   <-- INVALID"
            print(f"  {r['s']}: {r['n']}{marker}")
            if r["s"] not in VALID:
                bad.append(r["s"])

        if not bad:
            print("\nNo corrupted status values found. Nothing to do.")
            return

        for val in bad:
            target = REMAP.get(val, "APPLIED")
            result = await conn.execute(
                "UPDATE applications SET status = $1 WHERE status::text = $2",
                target, val,
            )
            print(f"\nFixed: '{val}' -> '{target}' ({result})")

        print("\nDone. All application statuses are now valid.")
    finally:
        await conn.close()


asyncio.run(fix())
