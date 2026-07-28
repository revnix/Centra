"""merge_gmail_and_auto_heads

Revision ID: merge_gmail_and_auto_heads
Revises: 7ba5147cacd9, a7c3f9d2e6b1
Create Date: 2026-07-28 13:40:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'merge_gmail_and_auto_heads'
down_revision: Union[str, Sequence[str], None] = ('7ba5147cacd9', 'a7c3f9d2e6b1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
