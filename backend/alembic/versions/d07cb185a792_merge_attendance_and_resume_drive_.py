"""merge_attendance_and_resume_drive_tracking_heads

Revision ID: d07cb185a792
Revises: 415d180cf82c, c3d4e5f6a7b8
Create Date: 2026-08-27 17:33:28.406272

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd07cb185a792'
down_revision: Union[str, Sequence[str], None] = ('415d180cf82c', 'c3d4e5f6a7b8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
