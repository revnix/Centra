"""add_interview_schedules_panel

Creates three new tables for the human-led Interview Scheduling & Feedback Panel:
  - interview_schedules   — schedule metadata (date, location, meeting link)
  - interview_panelists   — maps HR users to a schedule
  - interview_feedback    — structured post-interview feedback from each panelist

Also creates the two PostgreSQL enum types used by these tables:
  - schedulestatus        — SCHEDULED | COMPLETED | CANCELLED | RESCHEDULED
  - hirerecommendation    — STRONG_YES | YES | MAYBE | NO | STRONG_NO

Revision ID: a9b1c2d3e4f5
Revises: merge_heads_final
Create Date: 2026-07-28 13:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a9b1c2d3e4f5'
down_revision: Union[str, Sequence[str], None] = 'merge_gmail_and_auto_heads'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the three interview scheduling tables and their enum types."""

    # ── Enum types ──────────────────────────────────────────────────────────

    schedulestatus_enum = postgresql.ENUM(
        'SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED',
        name='schedulestatus',
        create_type=True,
    )
    hirerecommendation_enum = postgresql.ENUM(
        'STRONG_YES', 'YES', 'MAYBE', 'NO', 'STRONG_NO',
        name='hirerecommendation',
        create_type=True,
    )

    # ── interview_schedules ─────────────────────────────────────────────────

    op.create_table(
        'interview_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column(
            'application_id',
            sa.Integer(),
            sa.ForeignKey('applications.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'scheduled_at',
            sa.DateTime(timezone=True),
            nullable=False,
            comment='Interview date and time (tz-aware)',
        ),
        sa.Column(
            'duration_minutes',
            sa.Integer(),
            nullable=False,
            server_default='60',
            comment='Expected duration in minutes',
        ),
        sa.Column(
            'location',
            sa.String(length=255),
            nullable=True,
            comment='Physical location or platform name',
        ),
        sa.Column(
            'meeting_link',
            sa.String(length=1024),
            nullable=True,
            comment='Video call URL, if any',
        ),
        sa.Column(
            'notes',
            sa.Text(),
            nullable=True,
            comment='Internal HR notes visible only to the panel',
        ),
        sa.Column(
            'status',
            schedulestatus_enum,
            nullable=False,
            server_default='SCHEDULED',
        ),
        sa.Column(
            'created_by',
            sa.Integer(),
            sa.ForeignKey('users.id', ondelete='SET NULL'),
            nullable=True,
            comment='HR user who created the schedule',
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('application_id', name='uq_interview_schedules_application_id'),
    )
    op.create_index(
        op.f('ix_interview_schedules_id'),
        'interview_schedules', ['id'], unique=False,
    )
    op.create_index(
        op.f('ix_interview_schedules_application_id'),
        'interview_schedules', ['application_id'], unique=True,
    )
    op.create_index(
        op.f('ix_interview_schedules_status'),
        'interview_schedules', ['status'], unique=False,
    )

    # ── interview_panelists ─────────────────────────────────────────────────

    op.create_table(
        'interview_panelists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column(
            'schedule_id',
            sa.Integer(),
            sa.ForeignKey('interview_schedules.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'user_id',
            sa.Integer(),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'assigned_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_interview_panelists_id'),
        'interview_panelists', ['id'], unique=False,
    )
    op.create_index(
        op.f('ix_interview_panelists_schedule_id'),
        'interview_panelists', ['schedule_id'], unique=False,
    )
    op.create_index(
        op.f('ix_interview_panelists_user_id'),
        'interview_panelists', ['user_id'], unique=False,
    )

    # ── interview_feedback ──────────────────────────────────────────────────

    op.create_table(
        'interview_feedback',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column(
            'schedule_id',
            sa.Integer(),
            sa.ForeignKey('interview_schedules.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'panelist_id',
            sa.Integer(),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'overall_rating',
            sa.Integer(),
            nullable=False,
            comment='1–5 overall impression',
        ),
        sa.Column(
            'technical_rating',
            sa.Integer(),
            nullable=True,
            comment='1–5 technical competency',
        ),
        sa.Column(
            'communication_rating',
            sa.Integer(),
            nullable=True,
            comment='1–5 communication skills',
        ),
        sa.Column(
            'culture_fit_rating',
            sa.Integer(),
            nullable=True,
            comment='1–5 cultural alignment',
        ),
        sa.Column(
            'recommendation',
            hirerecommendation_enum,
            nullable=False,
        ),
        sa.Column(
            'strengths',
            sa.Text(),
            nullable=True,
            comment='Candidate strengths observed',
        ),
        sa.Column(
            'concerns',
            sa.Text(),
            nullable=True,
            comment='Areas of concern or gaps',
        ),
        sa.Column(
            'notes',
            sa.Text(),
            nullable=True,
            comment='Additional panelist notes',
        ),
        sa.Column(
            'submitted_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('overall_rating BETWEEN 1 AND 5', name='ck_feedback_overall_rating'),
        sa.CheckConstraint(
            'technical_rating IS NULL OR technical_rating BETWEEN 1 AND 5',
            name='ck_feedback_technical_rating',
        ),
        sa.CheckConstraint(
            'communication_rating IS NULL OR communication_rating BETWEEN 1 AND 5',
            name='ck_feedback_communication_rating',
        ),
        sa.CheckConstraint(
            'culture_fit_rating IS NULL OR culture_fit_rating BETWEEN 1 AND 5',
            name='ck_feedback_culture_fit_rating',
        ),
    )
    op.create_index(
        op.f('ix_interview_feedback_id'),
        'interview_feedback', ['id'], unique=False,
    )
    op.create_index(
        op.f('ix_interview_feedback_schedule_id'),
        'interview_feedback', ['schedule_id'], unique=False,
    )
    op.create_index(
        op.f('ix_interview_feedback_panelist_id'),
        'interview_feedback', ['panelist_id'], unique=False,
    )


def downgrade() -> None:
    """Drop the three interview scheduling tables and their enum types."""
    op.drop_index(op.f('ix_interview_feedback_panelist_id'), table_name='interview_feedback')
    op.drop_index(op.f('ix_interview_feedback_schedule_id'), table_name='interview_feedback')
    op.drop_index(op.f('ix_interview_feedback_id'), table_name='interview_feedback')
    op.drop_table('interview_feedback')

    op.drop_index(op.f('ix_interview_panelists_user_id'), table_name='interview_panelists')
    op.drop_index(op.f('ix_interview_panelists_schedule_id'), table_name='interview_panelists')
    op.drop_index(op.f('ix_interview_panelists_id'), table_name='interview_panelists')
    op.drop_table('interview_panelists')

    op.drop_index(op.f('ix_interview_schedules_status'), table_name='interview_schedules')
    op.drop_index(op.f('ix_interview_schedules_application_id'), table_name='interview_schedules')
    op.drop_index(op.f('ix_interview_schedules_id'), table_name='interview_schedules')
    op.drop_table('interview_schedules')

    # Drop enum types last (after all tables using them are gone)
    op.execute("DROP TYPE IF EXISTS hirerecommendation")
    op.execute("DROP TYPE IF EXISTS schedulestatus")
