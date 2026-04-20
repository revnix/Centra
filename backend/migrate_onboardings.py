"""
Direct SQL migration: create onboardings table + prerequisite enum types.
Safe to run multiple times (uses IF NOT EXISTS / DO $$ blocks).
"""
import asyncio
import os
from urllib.parse import urlparse

import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Convert SQLAlchemy-style URL to raw asyncpg format
# e.g. postgresql+asyncpg://user:pass@host/db  -> postgresql://user:pass@host/db
if "+asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("+asyncpg", "")

print(f"Connecting to: {DATABASE_URL.split('@')[-1]}")

SQL = """
-- Create enum types (safe, idempotent)
DO $$ BEGIN
    CREATE TYPE onboardingstatus AS ENUM (
        'PENDING_CANDIDATE_JOINING',
        'PENDING_HR_DETAILS',
        'PENDING_CANDIDATE_DOCS',
        'PENDING_HR_DOCS',
        'PENDING_IT_SETUP',
        'PENDING_INDUCTION',
        'COMPLETED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE shifttiming AS ENUM (
        '1st Shift',
        '2nd Shift',
        '3rd Shift'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create onboardings table
CREATE TABLE IF NOT EXISTS onboardings (
    id                          SERIAL PRIMARY KEY,
    application_id              INTEGER NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    user_id                     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status                      onboardingstatus NOT NULL DEFAULT 'PENDING_CANDIDATE_JOINING',
    joining_date                TIMESTAMPTZ,
    reporting_time              VARCHAR(50),
    office_location             VARCHAR(255),
    shift_timing                shifttiming,
    doc_front_picture_url       TEXT,
    doc_id_card_url             TEXT,
    doc_salary_slip_url         TEXT,
    doc_experience_letter_url   TEXT,
    hr_verified                 BOOLEAN NOT NULL DEFAULT FALSE,
    it_slack_setup              BOOLEAN NOT NULL DEFAULT FALSE,
    it_gmail_setup              BOOLEAN NOT NULL DEFAULT FALSE,
    it_browser_extensions       BOOLEAN NOT NULL DEFAULT FALSE,
    it_gmail_signature          BOOLEAN NOT NULL DEFAULT FALSE,
    it_bordio_access            BOOLEAN NOT NULL DEFAULT FALSE,
    it_office365_access         BOOLEAN NOT NULL DEFAULT FALSE,
    ind_hr_welcome_session      BOOLEAN NOT NULL DEFAULT FALSE,
    ind_hr_handbook_shared      BOOLEAN NOT NULL DEFAULT FALSE,
    ind_hr_policies_explained   BOOLEAN NOT NULL DEFAULT FALSE,
    ind_it_credentials_provided BOOLEAN NOT NULL DEFAULT FALSE,
    ind_it_security_induction   BOOLEAN NOT NULL DEFAULT FALSE,
    ind_manager_buddy_assigned  BOOLEAN NOT NULL DEFAULT FALSE,
    ind_manager_team_intro      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS ix_onboardings_id             ON onboardings(id);
CREATE INDEX IF NOT EXISTS ix_onboardings_application_id ON onboardings(application_id);
"""


async def migrate():
    conn = await asyncpg.connect(DATABASE_URL, ssl="require")
    try:
        await conn.execute(SQL)
        print("[OK] Migration complete - onboardings table is ready.")
        # Verify
        row = await conn.fetchrow(
            "SELECT COUNT(*) AS n FROM information_schema.tables "
            "WHERE table_name = 'onboardings' AND table_schema = 'public'"
        )
        print(f"   Table exists check: {'YES' if row['n'] > 0 else 'NO (something went wrong!)'}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(migrate())
