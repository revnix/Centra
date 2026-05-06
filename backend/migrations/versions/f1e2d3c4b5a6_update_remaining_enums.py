"""update_remaining_enums

Revision ID: f1e2d3c4b5a6
Revises: eb8d7a123abc
Create Date: 2026-05-06 12:54:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f1e2d3c4b5a6'
down_revision: Union[str, Sequence[str], None] = 'eb8d7a123abc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        # Application Status - Added 'ONBOARDING'
        op.execute("ALTER TYPE applicationstatus ADD VALUE IF NOT EXISTS 'ONBOARDING'")

        # User Role - Python model uses lowercase values
        user_roles = ['admin', 'reviewer', 'candidate', 'guest']
        for role in user_roles:
            op.execute(f"ALTER TYPE userrole ADD VALUE IF NOT EXISTS '{role}'")


def downgrade() -> None:
    pass
