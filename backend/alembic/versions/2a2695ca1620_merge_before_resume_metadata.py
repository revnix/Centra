"""merge_before_resume_metadata

Revision ID: 2a2695ca1620
Revises: 3e9eb3640d1e, 54224e9a59bb
Create Date: 2026-07-01 12:28:08.683673

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2a2695ca1620'
down_revision: Union[str, Sequence[str], None] = ('3e9eb3640d1e', '54224e9a59bb')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
