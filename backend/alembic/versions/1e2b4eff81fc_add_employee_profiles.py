"""add_employee_profiles

Revision ID: 1e2b4eff81fc
Revises: 8a82027e4b45
Create Date: 2026-08-21 21:11:13.132362

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1e2b4eff81fc"
down_revision: Union[str, Sequence[str], None] = "8a82027e4b45"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add enum value for users.role
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'employee'")

    op.create_table(
        "employee_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("department_id", sa.Integer(), nullable=True),
        sa.Column("job_title", sa.String(length=120), nullable=True),
        sa.Column("joining_date", sa.Date(), nullable=True),
        sa.Column("manager_user_id", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["manager_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_employee_profiles_department_id"), "employee_profiles", ["department_id"], unique=False)
    op.create_index(op.f("ix_employee_profiles_manager_user_id"), "employee_profiles", ["manager_user_id"], unique=False)
    op.create_index(op.f("ix_employee_profiles_user_id"), "employee_profiles", ["user_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # NOTE: Postgres enums cannot easily remove values; we keep 'employee'.
    op.drop_index(op.f("ix_employee_profiles_user_id"), table_name="employee_profiles")
    op.drop_index(op.f("ix_employee_profiles_manager_user_id"), table_name="employee_profiles")
    op.drop_index(op.f("ix_employee_profiles_department_id"), table_name="employee_profiles")
    op.drop_table("employee_profiles")
