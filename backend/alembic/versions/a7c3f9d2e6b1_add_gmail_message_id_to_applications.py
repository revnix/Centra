"""Add gmail_message_id to applications

Revision ID: a7c3f9d2e6b1
Revises: e5f6a7b8c9d0
Create Date: 2026-07-16 06:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a7c3f9d2e6b1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'applications',
        sa.Column(
            'gmail_message_id',
            sa.String(length=255),
            nullable=True,
            comment='Gmail message ID this application was imported from, if any',
        ),
    )
    op.create_index(
        op.f('ix_applications_gmail_message_id'),
        'applications',
        ['gmail_message_id'],
        unique=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_applications_gmail_message_id'), table_name='applications')
    op.drop_column('applications', 'gmail_message_id')
