"""merge two heads

Revision ID: merge_heads_final
Revises: 42a07c11548f, f1a2b3c4d5e6
Create Date: 2026-07-07 10:45:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'merge_heads_final'
down_revision: Union[str, Sequence[str], None] = ('42a07c11548f', 'f1a2b3c4d5e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
