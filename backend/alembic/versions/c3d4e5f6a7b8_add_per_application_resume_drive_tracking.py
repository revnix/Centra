"""Add per-application resume Drive tracking

Revision ID: c3d4e5f6a7b8
Revises: b7c8d9e0f1a2
Create Date: 2026-08-05 07:30:00.000000

Adds columns so resume-to-Drive promotion is tracked per application instead of
per candidate. Previously CandidateProfile.resume_storage_provider alone gated
promotion, so a candidate shortlisted for a second job would be skipped and
never get a resume copy in that job's Drive folder.

  - applications.resume_drive_link:     Drive webViewLink for this application's copy
  - applications.resume_drive_file_id:  Drive file ID for this application's copy
  - applications.resume_promoted_at:    when this application's resume was promoted
  - candidate_profiles.resume_source_url: original (pre-Drive) resume URL, preserved
    so later promotions for other jobs can still fetch the source file
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns(bind, table_name: str) -> set[str]:
    return {
        row[0]
        for row in bind.execute(
            sa.text("SELECT column_name FROM information_schema.columns WHERE table_name = :t"),
            {"t": table_name},
        )
    }


def upgrade() -> None:
    bind = op.get_bind()

    app_cols = _existing_columns(bind, "applications")
    if "resume_drive_link" not in app_cols:
        op.add_column(
            "applications",
            sa.Column("resume_drive_link", sa.String(), nullable=True,
                      comment="Google Drive webViewLink for the resume copy uploaded into this job's folder"),
        )
    if "resume_drive_file_id" not in app_cols:
        op.add_column(
            "applications",
            sa.Column("resume_drive_file_id", sa.String(), nullable=True,
                      comment="Google Drive file ID for this application's resume copy"),
        )
    if "resume_promoted_at" not in app_cols:
        op.add_column(
            "applications",
            sa.Column("resume_promoted_at", sa.DateTime(timezone=True), nullable=True,
                      comment="Timestamp this application's resume was promoted to Drive"),
        )

    profile_cols = _existing_columns(bind, "candidate_profiles")
    if "resume_source_url" not in profile_cols:
        op.add_column(
            "candidate_profiles",
            sa.Column("resume_source_url", sa.String(), nullable=True,
                      comment="Original (pre-Drive) resume URL, preserved for repeat promotions"),
        )


def downgrade() -> None:
    bind = op.get_bind()

    profile_cols = _existing_columns(bind, "candidate_profiles")
    if "resume_source_url" in profile_cols:
        op.drop_column("candidate_profiles", "resume_source_url")

    app_cols = _existing_columns(bind, "applications")
    if "resume_promoted_at" in app_cols:
        op.drop_column("applications", "resume_promoted_at")
    if "resume_drive_file_id" in app_cols:
        op.drop_column("applications", "resume_drive_file_id")
    if "resume_drive_link" in app_cols:
        op.drop_column("applications", "resume_drive_link")
