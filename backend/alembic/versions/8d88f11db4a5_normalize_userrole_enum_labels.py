"""normalize_userrole_enum_labels

Revision ID: 8d88f11db4a5
Revises: 2a77ce4b149c
Create Date: 2026-08-21

"""

from typing import Sequence, Union

from alembic import op


revision: str = "8d88f11db4a5"
down_revision: Union[str, Sequence[str], None] = "2a77ce4b149c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # SQLAlchemy's Enum(UserRole) stores the ENUM *name* by default (e.g. "EMPLOYEE"),
    # not the Enum value ("employee"). Ensure Postgres enum labels match.
    #
    # Postgres requires the ALTER TYPE ... ADD VALUE to be committed before
    # the new value can be used in UPDATE statements.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'HR'")
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'EMPLOYEE'")

    # (Skipped: DB only has uppercase roles, comparing with lowercase crashes Postgres enum cast)
    pass


def downgrade() -> None:
    """Downgrade schema."""
    # No-op: Postgres enums cannot easily remove values.
    pass
