"""add_missing_posts_columns

Revision ID: d976a6fd4f06
Revises: 98b7f714713f
Create Date: 2026-05-04 17:52:20.602756

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd976a6fd4f06'
down_revision: Union[str, Sequence[str], None] = '98b7f714713f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use IF NOT EXISTS so this is safe on both fresh and existing DBs

    # Add columns that the Docker app uses but were missing from the initial migration
    op.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS source VARCHAR")
    op.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS city VARCHAR")
    op.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS qualification VARCHAR")
    op.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS expected_salary VARCHAR")
    op.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS salary_filter_status VARCHAR")

    op.execute("""
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    """)
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_password_reset_tokens_token "
        "ON password_reset_tokens (token)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_id "
        "ON password_reset_tokens (id)"
    )

    # Update column comments on posts (these already exist in the DB)
    op.alter_column('posts', 'requirements',
                    existing_type=sa.TEXT(),
                    comment='Detailed requirements text',
                    existing_nullable=True)
    op.alter_column('posts', 'preferred_qualifications',
                    existing_type=sa.TEXT(),
                    comment='Preferred qualifications text',
                    existing_nullable=True)
    op.alter_column('posts', 'manager_feedback',
                    existing_type=sa.TEXT(),
                    comment='Internal feedback from hiring manager',
                    existing_nullable=True)


def downgrade() -> None:
    op.alter_column('posts', 'manager_feedback',
                    existing_type=sa.TEXT(),
                    comment=None,
                    existing_comment='Internal feedback from hiring manager',
                    existing_nullable=True)
    op.alter_column('posts', 'preferred_qualifications',
                    existing_type=sa.TEXT(),
                    comment=None,
                    existing_comment='Preferred qualifications text',
                    existing_nullable=True)
    op.alter_column('posts', 'requirements',
                    existing_type=sa.TEXT(),
                    comment=None,
                    existing_comment='Detailed requirements text',
                    existing_nullable=True)
    op.drop_index('ix_password_reset_tokens_id', table_name='password_reset_tokens')
    op.drop_index('ix_password_reset_tokens_token', table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')
    op.drop_column('applications', 'salary_filter_status')
    op.drop_column('applications', 'expected_salary')
    op.drop_column('applications', 'source')
    op.drop_column('applications', 'qualification')
    op.drop_column('applications', 'city')
