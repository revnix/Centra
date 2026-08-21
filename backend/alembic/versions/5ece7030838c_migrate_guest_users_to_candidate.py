"""migrate_guest_users_to_candidate

Revision ID: 5ece7030838c
Revises: 1e2b4eff81fc
Create Date: 2026-08-21 21:17:25.632549

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "5ece7030838c"
down_revision: Union[str, Sequence[str], None] = "1e2b4eff81fc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Guest role is removed from app code. Convert any existing rows.
    op.execute("UPDATE users SET role='CANDIDATE' WHERE role='GUEST'")


def downgrade() -> None:
    """Downgrade schema."""
    # No-op: we intentionally do not restore 'GUEST' usage.
    pass
