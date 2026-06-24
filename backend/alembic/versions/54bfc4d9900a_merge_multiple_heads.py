"""Merge multiple heads

Revision ID: 54bfc4d9900a
Revises: c1d2e3f4a5b6, c7d8e9f0a1b2
Create Date: 2026-06-24 11:43:03.048464

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '54bfc4d9900a'
down_revision: Union[str, Sequence[str], None] = ('c1d2e3f4a5b6', 'c7d8e9f0a1b2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
