"""empty message

Revision ID: 3c6bbdae6b3d
Revises: d3f4a5b6c7e8
Create Date: 2026-07-01 16:42:30.897054

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c6bbdae6b3d'
down_revision: Union[str, Sequence[str], None] = 'd3f4a5b6c7e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
