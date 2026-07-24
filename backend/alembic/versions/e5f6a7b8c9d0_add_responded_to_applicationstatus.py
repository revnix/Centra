"""add_responded_to_applicationstatus_enum

Revision ID: e5f6a7b8c9d0
Revises: merge_heads_final
Create Date: 2026-07-07 10:50:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'e5f6a7b8c9d0'
down_revision = 'merge_heads_final'
branch_labels = None
depends_on = None


def upgrade():
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
    # op.execute("COMMIT") ends the current transaction so PostgreSQL accepts the DDL.
    op.execute("COMMIT")
    op.execute("ALTER TYPE applicationstatus ADD VALUE IF NOT EXISTS 'RESPONDED' AFTER 'INTERVIEW_COMPLETED'")


def downgrade():
    # PostgreSQL does not support removing enum values without recreating the type.
    # Leave this as a no-op to keep it safe.
    pass
