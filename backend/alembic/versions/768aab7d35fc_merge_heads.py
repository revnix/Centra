"""merge heads

Revision ID: 768aab7d35fc
Revises: 415d180cf82c, c3d4e5f6a7b8
Create Date: 2026-08-24 11:23:25.561607

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '768aab7d35fc'
down_revision: Union[str, Sequence[str], None] = ('415d180cf82c', 'c3d4e5f6a7b8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
