"""merge_heads

Revision ID: 0ffdecf2d8af
Revises: 3e9eb3640d1e, 54224e9a59bb
Create Date: 2026-06-29 10:40:35.754943

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0ffdecf2d8af'
down_revision: Union[str, Sequence[str], None] = ('3e9eb3640d1e', '54224e9a59bb')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
