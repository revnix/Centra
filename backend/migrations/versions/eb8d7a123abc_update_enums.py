"""update_job_enums

Revision ID: eb8d7a123abc
Revises: d976a6fd4f06
Create Date: 2026-05-06 12:47:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'eb8d7a123abc'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use autocommit block for ALTER TYPE as it cannot run in a transaction in some Postgres versions
    # and ADD VALUE specifically cannot run in a transaction in Postgres < 12.
    # Even in newer versions, it's safer to run it outside.
    
    with op.get_context().autocommit_block():
        # Job Status
        op.execute("ALTER TYPE jobstatus ADD VALUE IF NOT EXISTS 'APPROVED'")
        op.execute("ALTER TYPE jobstatus ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED'")
        
        # Job Type - Python model uses lowercase values
        job_types = ['full_time', 'part_time', 'contract', 'temporary', 'internship', 'volunteer', 'freelance']
        for jt in job_types:
            op.execute(f"ALTER TYPE jobtype ADD VALUE IF NOT EXISTS '{jt}'")
            
        # Experience Level - Python model uses lowercase values
        exp_levels = ['entry_level', 'junior', 'associate', 'mid', 'mid_senior', 'senior', 'lead', 'director', 'executive']
        for el in exp_levels:
            op.execute(f"ALTER TYPE experiencelevel ADD VALUE IF NOT EXISTS '{el}'")

        # Application Status - Added 'ONBOARDING'
        op.execute("ALTER TYPE applicationstatus ADD VALUE IF NOT EXISTS 'ONBOARDING'")

        # User Role - Python model uses lowercase values
        user_roles = ['admin', 'reviewer', 'candidate', 'guest']
        for role in user_roles:
            op.execute(f"ALTER TYPE userrole ADD VALUE IF NOT EXISTS '{role}'")


def downgrade() -> None:
    # Postgres doesn't easily support removing values from an ENUM
    pass
