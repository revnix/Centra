"""Add application_deadline and expires_at to posts

Revision ID: a1b2c3d4e5f6
Revises: 69a28997daad
Create Date: 2026-06-12 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '69a28997daad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add application_deadline and expires_at columns to posts (safe/idempotent)."""
    bind = op.get_bind()

    # Check existing columns via information_schema to avoid errors if already present
    existing = [
        row[0]
        for row in bind.execute(
            sa.text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'posts'"
            )
        )
    ]

    if 'application_deadline' not in existing:
        op.add_column(
            'posts',
            sa.Column(
                'application_deadline',
                sa.DateTime(timezone=True),
                nullable=True,
                comment='Application deadline set by HR at creation time',
            )
        )

    if 'expires_at' not in existing:
        op.add_column(
            'posts',
            sa.Column(
                'expires_at',
                sa.DateTime(timezone=True),
                nullable=True,
                comment='When the job listing expires (auto-set from application_deadline)',
            )
        )


def downgrade() -> None:
    """Remove application_deadline and expires_at from posts."""
    bind = op.get_bind()
    existing = [
        row[0]
        for row in bind.execute(
            sa.text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'posts'"
            )
        )
    ]
    if 'expires_at' in existing:
        op.drop_column('posts', 'expires_at')
    if 'application_deadline' in existing:
        op.drop_column('posts', 'application_deadline')
