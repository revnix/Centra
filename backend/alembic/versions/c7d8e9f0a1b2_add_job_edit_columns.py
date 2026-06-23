"""Add job edit columns and update status enum

Revision ID: c7d8e9f0a1b2
Revises: b8c9d0e1f2a3
Create Date: 2026-06-23 12:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c7d8e9f0a1b2'
down_revision: Union[str, Sequence[str], None] = 'b8c9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to posts table
    op.add_column('posts', sa.Column('edited_title', sa.Text(), nullable=True))
    op.add_column('posts', sa.Column('edited_description', sa.Text(), nullable=True))
    op.add_column('posts', sa.Column('edited_by_email', sa.String(length=255), nullable=True))

    # Add 'EDIT_SUBMITTED' to JobStatus enum
    # Since it's PostgreSQL, we need to handle the ENUM type update
    op.execute("ALTER TYPE jobstatus ADD VALUE IF NOT EXISTS 'EDIT_SUBMITTED'")


def downgrade() -> None:
    # Remove the columns
    op.drop_column('posts', 'edited_by_email')
    op.drop_column('posts', 'edited_description')
    op.drop_column('posts', 'edited_title')

    # Note: Removing a value from a PostgreSQL ENUM is complex and usually not recommended 
    # without recreating the type, so we leave it.
