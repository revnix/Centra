"""Add platform_display_name to user_integrations

Revision ID: b7c8d9e0f1a2
Revises: a9b1c2d3e4f5
Create Date: 2026-07-30 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, Sequence[str], None] = 'a9b1c2d3e4f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add platform_display_name to user_integrations (safe/idempotent)."""
    bind = op.get_bind()

    existing = [
        row[0]
        for row in bind.execute(
            sa.text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'user_integrations'"
            )
        )
    ]

    if 'platform_display_name' not in existing:
        op.add_column(
            'user_integrations',
            sa.Column(
                'platform_display_name',
                sa.String(),
                nullable=True,
                comment='Human-readable account name shown in the UI, e.g. "Abdullah Khan"',
            )
        )


def downgrade() -> None:
    """Remove platform_display_name from user_integrations."""
    bind = op.get_bind()
    existing = [
        row[0]
        for row in bind.execute(
            sa.text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'user_integrations'"
            )
        )
    ]
    if 'platform_display_name' in existing:
        op.drop_column('user_integrations', 'platform_display_name')
