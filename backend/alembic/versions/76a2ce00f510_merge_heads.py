"""merge heads

Revision ID: 76a2ce00f510
Revises: 42a07c11548f, f1a2b3c4d5e6
Create Date: 2026-07-08 11:52:21.616173

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '76a2ce00f510'
down_revision: Union[str, Sequence[str], None] = ('42a07c11548f', 'f1a2b3c4d5e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
