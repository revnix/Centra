"""Add requirements to posts

Revision ID: 69a28997daad
Revises: 
Create Date: 2026-05-05 13:18:27.992913

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '69a28997daad'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('posts', sa.Column('requirements', sa.ARRAY(sa.String()), nullable=True, comment='Mandatory requirements/qualifications'))

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('posts', 'requirements')
