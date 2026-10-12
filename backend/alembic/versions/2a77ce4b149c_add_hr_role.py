"""add_hr_role

Revision ID: 2a77ce4b149c
Revises: 5ece7030838c
Create Date: 2026-08-21 21:24:30.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "2a77ce4b149c"
down_revision: Union[str, Sequence[str], None] = "5ece7030838c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'hr'")


def downgrade() -> None:
    """Downgrade schema."""
    # Postgres enums cannot easily remove values.
    pass
