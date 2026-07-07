"""Auto migration for edited_title

Revision ID: 3e9eb3640d1e
Revises: 54bfc4d9900a
Create Date: 2026-06-24 11:45:38.365163

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3e9eb3640d1e'
down_revision: Union[str, Sequence[str], None] = '54bfc4d9900a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Use IF NOT EXISTS / IF EXISTS throughout to be idempotent — prior migrations
    # (c1d2e3f4a5b6, c7d8e9f0a1b2) may have already created these objects.
    op.alter_column('applications', 'expected_salary',
               existing_type=sa.DOUBLE_PRECISION(precision=53),
               type_=sa.String(length=100),
               existing_comment="Candidate's expected salary",
               existing_nullable=True)
    op.execute("CREATE INDEX IF NOT EXISTS ix_applications_candidate_status ON applications(candidate_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_applications_job_id_created_at ON applications(job_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_applications_job_id_status ON applications(job_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_interview_sessions_expires_at ON interview_sessions(expires_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_interview_sessions_status ON interview_sessions(status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_onboarding_documents_application_id ON onboarding_documents(application_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_onboardings_status ON onboardings(status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_onboardings_user_id ON onboardings(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_expires_at ON password_reset_tokens(expires_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id ON password_reset_tokens(user_id)")
    # Add columns only if they don't already exist (added by c7d8e9f0a1b2)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='edited_title') THEN
                ALTER TABLE posts ADD COLUMN edited_title TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='edited_description') THEN
                ALTER TABLE posts ADD COLUMN edited_description TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='edited_by_email') THEN
                ALTER TABLE posts ADD COLUMN edited_by_email VARCHAR(255);
            END IF;
        END $$;
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_posts_created_at ON posts(created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_posts_created_by_status ON posts(created_by, status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_posts_status_created_at ON posts(status, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_posts_status_deleted_at ON posts(status, deleted_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_integrations_user_id ON user_integrations(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_integrations_user_platform ON user_integrations(user_id, platform)")
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    pass
