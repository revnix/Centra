"""Normalize job_type and experience_level enum case in posts table

Revision ID: f1a2b3c4d5e6
Revises: 3c6bbdae6b3d
Create Date: 2026-07-02

The DB was populated when jobtype/experiencelevel enums had UPPER_CASE labels
(e.g. 'FULL_TIME').  The SQLAlchemy model now uses lower_case values
('full_time').  This migration converts the stored values and the PostgreSQL
ENUM types to match.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "3c6bbdae6b3d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Mapping of old UPPER_CASE values → new lower_case values
JOB_TYPE_MAP = {
    "FULL_TIME":  "full_time",
    "PART_TIME":  "part_time",
    "CONTRACT":   "contract",
    "TEMPORARY":  "temporary",
    "INTERNSHIP": "internship",
    "VOLUNTEER":  "volunteer",
    "FREELANCE":  "freelance",
}

EXPERIENCE_LEVEL_MAP = {
    "ENTRY_LEVEL": "entry_level",
    "JUNIOR":      "junior",
    "ASSOCIATE":   "associate",
    "MID":         "mid",
    "MID_SENIOR":  "mid_senior",
    "SENIOR":      "senior",
    "LEAD":        "lead",
    "DIRECTOR":    "director",
    "EXECUTIVE":   "executive",
}


def upgrade() -> None:
    # ── Step 1: convert the column to plain TEXT so we can rewrite values ──────
    op.execute("ALTER TABLE posts ALTER COLUMN job_type TYPE TEXT USING job_type::TEXT")
    op.execute("ALTER TABLE posts ALTER COLUMN experience_level TYPE TEXT USING experience_level::TEXT")

    # ── Step 2: rewrite UPPER_CASE rows → lower_case ───────────────────────────
    for old, new in JOB_TYPE_MAP.items():
        op.execute(f"UPDATE posts SET job_type = '{new}' WHERE job_type = '{old}'")

    for old, new in EXPERIENCE_LEVEL_MAP.items():
        op.execute(
            f"UPDATE posts SET experience_level = '{new}' WHERE experience_level = '{old}'"
        )

    # ── Step 3: drop the old ENUM types (may have UPPER or lower labels) ────────
    op.execute("DROP TYPE IF EXISTS jobtype CASCADE")
    op.execute("DROP TYPE IF EXISTS experiencelevel CASCADE")

    # ── Step 4: recreate ENUMs with lower_case labels ───────────────────────────
    op.execute(
        "CREATE TYPE jobtype AS ENUM "
        "('full_time', 'part_time', 'contract', 'temporary', 'internship', 'volunteer', 'freelance')"
    )
    op.execute(
        "CREATE TYPE experiencelevel AS ENUM "
        "('entry_level', 'junior', 'associate', 'mid', 'mid_senior', 'senior', 'lead', 'director', 'executive')"
    )

    # ── Step 5: cast columns back to the new ENUM types ─────────────────────────
    op.execute(
        "ALTER TABLE posts ALTER COLUMN job_type "
        "TYPE jobtype USING job_type::jobtype"
    )
    op.execute(
        "ALTER TABLE posts ALTER COLUMN experience_level "
        "TYPE experiencelevel USING experience_level::experiencelevel"
    )


def downgrade() -> None:
    # Convert back to TEXT, rewrite values to UPPER_CASE, recreate old ENUMs
    op.execute("ALTER TABLE posts ALTER COLUMN job_type TYPE TEXT USING job_type::TEXT")
    op.execute("ALTER TABLE posts ALTER COLUMN experience_level TYPE TEXT USING experience_level::TEXT")

    for new, old in {v: k for k, v in JOB_TYPE_MAP.items()}.items():
        op.execute(f"UPDATE posts SET job_type = '{old}' WHERE job_type = '{new}'")

    for new, old in {v: k for k, v in EXPERIENCE_LEVEL_MAP.items()}.items():
        op.execute(
            f"UPDATE posts SET experience_level = '{old}' WHERE experience_level = '{new}'"
        )

    op.execute("DROP TYPE IF EXISTS jobtype CASCADE")
    op.execute("DROP TYPE IF EXISTS experiencelevel CASCADE")

    op.execute(
        "CREATE TYPE jobtype AS ENUM "
        "('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'VOLUNTEER', 'FREELANCE')"
    )
    op.execute(
        "CREATE TYPE experiencelevel AS ENUM "
        "('ENTRY_LEVEL', 'JUNIOR', 'ASSOCIATE', 'MID', 'MID_SENIOR', 'SENIOR', 'LEAD', 'DIRECTOR', 'EXECUTIVE')"
    )

    op.execute(
        "ALTER TABLE posts ALTER COLUMN job_type "
        "TYPE jobtype USING job_type::jobtype"
    )
    op.execute(
        "ALTER TABLE posts ALTER COLUMN experience_level "
        "TYPE experiencelevel USING experience_level::experiencelevel"
    )
