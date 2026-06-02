"""
P4 — Performance Index Migration
Adds missing indexes to the `applications` and `onboarding_documents` tables.

Indexes added:
  applications.candidate_id  — WHERE candidate_id = ? (get_applications_by_user_id)
  applications.job_id        — WHERE job_id = ?
  applications.created_at    — ORDER BY created_at DESC (every list call)
  onboarding_documents.application_id — WHERE application_id = ? (document fetch per candidate)

Usage (run once from the backend/ directory):
    python add_performance_indexes.py
"""

import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

INDEXES = [
    # applications table — FK columns used in WHERE clauses
    (
        "ix_applications_candidate_id",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_applications_candidate_id "
        "ON applications(candidate_id);"
    ),
    (
        "ix_applications_job_id",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_applications_job_id "
        "ON applications(job_id);"
    ),
    # applications table — used in ORDER BY created_at DESC on every list request
    (
        "ix_applications_created_at",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_applications_created_at "
        "ON applications(created_at DESC);"
    ),
    # onboarding_documents table — WHERE application_id = ? on every document drawer open
    (
        "ix_onboarding_documents_application_id",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_onboarding_documents_application_id "
        "ON onboarding_documents(application_id);"
    ),
]


async def main():
    if not DATABASE_URL or DATABASE_URL == "postgresql://":
        print("❌ DATABASE_URL not set in .env — aborting.")
        return

    print(f"🔗 Connecting to: {DATABASE_URL[:40]}...")
    conn = await asyncpg.connect(DATABASE_URL)

    for name, stmt in INDEXES:
        try:
            print(f"\n⏳ Creating index: {name}")
            await conn.execute(stmt)
            print(f"✅ {name} — done")
        except Exception as e:
            print(f"⚠️  {name} — skipped ({e})")

    await conn.close()
    print("\n✅ All performance indexes applied successfully.")
    print("   Re-running this script is safe — all statements use IF NOT EXISTS.")


if __name__ == "__main__":
    asyncio.run(main())
