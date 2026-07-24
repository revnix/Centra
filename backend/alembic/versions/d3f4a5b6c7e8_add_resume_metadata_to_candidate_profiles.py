"""add_resume_metadata_to_candidate_profiles

Revision ID: d3f4a5b6c7e8
Revises: 2a2695ca1620
Create Date: 2026-07-01

Adds two new columns to the candidate_profiles table:
  - resume_file_id:           stores the remote storage file ID (e.g. Google Drive file ID)
  - resume_storage_provider:  records which backend was used ('google_drive' or 'cloudinary')
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d3f4a5b6c7e8"
down_revision: Union[str, Sequence[str], None] = "2a2695ca1620"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("candidate_profiles", sa.Column("resume_file_id", sa.String(), nullable=True))
    op.add_column("candidate_profiles", sa.Column("resume_storage_provider", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("candidate_profiles", "resume_storage_provider")
    op.drop_column("candidate_profiles", "resume_file_id")
