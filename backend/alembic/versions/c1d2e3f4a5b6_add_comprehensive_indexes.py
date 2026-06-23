"""Add comprehensive database indexes for performance

Revision ID: c1d2e3f4a5b6
Revises: b8c9d0e1f2a3
Create Date: 2026-06-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'b8c9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── posts ──────────────────────────────────────────────────────────────
    # Composite: listing jobs by status sorted by date
    op.execute("CREATE INDEX IF NOT EXISTS ix_posts_status_created_at ON posts(status, created_at DESC)")
    # Composite: filtering active (non-deleted) jobs by status
    op.execute("CREATE INDEX IF NOT EXISTS ix_posts_status_deleted_at ON posts(status, deleted_at)")
    # Composite: admin view — a user's jobs by status
    op.execute("CREATE INDEX IF NOT EXISTS ix_posts_created_by_status ON posts(created_by, status)")
    # Single: ORDER BY created_at on full listings
    op.execute("CREATE INDEX IF NOT EXISTS ix_posts_created_at ON posts(created_at DESC)")

    # ── applications ───────────────────────────────────────────────────────
    # Composite: pipeline view — applications for a job filtered by status
    op.execute("CREATE INDEX IF NOT EXISTS ix_applications_job_id_status ON applications(job_id, status)")
    # Composite: candidate dashboard — their applications by status
    op.execute("CREATE INDEX IF NOT EXISTS ix_applications_candidate_status ON applications(candidate_id, status)")
    # Composite: applications for a job sorted by date
    op.execute("CREATE INDEX IF NOT EXISTS ix_applications_job_id_created_at ON applications(job_id, created_at DESC)")

    # ── interview_sessions ─────────────────────────────────────────────────
    # Single: filter sessions by status
    op.execute("CREATE INDEX IF NOT EXISTS ix_interview_sessions_status ON interview_sessions(status)")
    # Single: cleanup expired sessions
    op.execute("CREATE INDEX IF NOT EXISTS ix_interview_sessions_expires_at ON interview_sessions(expires_at)")

    # ── onboardings ────────────────────────────────────────────────────────
    # Single: look up onboarding by user
    op.execute("CREATE INDEX IF NOT EXISTS ix_onboardings_user_id ON onboardings(user_id)")
    # Single: filter onboardings by status
    op.execute("CREATE INDEX IF NOT EXISTS ix_onboardings_status ON onboardings(status)")

    # ── onboarding_documents ───────────────────────────────────────────────
    # Single: fetch documents for an application
    op.execute("CREATE INDEX IF NOT EXISTS ix_onboarding_documents_application_id ON onboarding_documents(application_id)")

    # ── user_integrations ──────────────────────────────────────────────────
    # Single: fetch all integrations for a user
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_integrations_user_id ON user_integrations(user_id)")
    # Composite: look up a user's specific platform integration
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_integrations_user_platform ON user_integrations(user_id, platform)")

    # ── password_reset_tokens ──────────────────────────────────────────────
    # Single: fetch tokens by user
    op.execute("CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id ON password_reset_tokens(user_id)")
    # Single: cleanup expired tokens
    op.execute("CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_expires_at ON password_reset_tokens(expires_at)")


def downgrade() -> None:
    # posts
    op.execute("DROP INDEX IF EXISTS ix_posts_status_created_at")
    op.execute("DROP INDEX IF EXISTS ix_posts_status_deleted_at")
    op.execute("DROP INDEX IF EXISTS ix_posts_created_by_status")
    op.execute("DROP INDEX IF EXISTS ix_posts_created_at")

    # applications
    op.execute("DROP INDEX IF EXISTS ix_applications_job_id_status")
    op.execute("DROP INDEX IF EXISTS ix_applications_candidate_status")
    op.execute("DROP INDEX IF EXISTS ix_applications_job_id_created_at")

    # interview_sessions
    op.execute("DROP INDEX IF EXISTS ix_interview_sessions_status")
    op.execute("DROP INDEX IF EXISTS ix_interview_sessions_expires_at")

    # onboardings
    op.execute("DROP INDEX IF EXISTS ix_onboardings_user_id")
    op.execute("DROP INDEX IF EXISTS ix_onboardings_status")

    # onboarding_documents
    op.execute("DROP INDEX IF EXISTS ix_onboarding_documents_application_id")

    # user_integrations
    op.execute("DROP INDEX IF EXISTS ix_user_integrations_user_id")
    op.execute("DROP INDEX IF EXISTS ix_user_integrations_user_platform")

    # password_reset_tokens
    op.execute("DROP INDEX IF EXISTS ix_password_reset_tokens_user_id")
    op.execute("DROP INDEX IF EXISTS ix_password_reset_tokens_expires_at")
