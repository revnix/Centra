"""Convert JSON/Text columns to text arrays in posts

Revision ID: b8c9d0e1f2a3
Revises: a1b2c3d4e5f6
Create Date: 2026-06-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision: str = 'b8c9d0e1f2a3'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Convert required_skills from JSON to text[]
    op.alter_column('posts', 'required_skills', new_column_name='required_skills_old')
    op.add_column('posts', sa.Column('required_skills', sa.ARRAY(sa.String()), nullable=True))
    op.execute("""
        UPDATE posts
        SET required_skills = ARRAY(
            SELECT jsonb_array_elements_text(required_skills_old::jsonb)
        )
        WHERE required_skills_old IS NOT NULL AND required_skills_old::text <> ''
    """)
    op.drop_column('posts', 'required_skills_old')

    # 2. Convert preferred_skills from JSON to text[]
    op.alter_column('posts', 'preferred_skills', new_column_name='preferred_skills_old')
    op.add_column('posts', sa.Column('preferred_skills', sa.ARRAY(sa.String()), nullable=True))
    op.execute("""
        UPDATE posts
        SET preferred_skills = ARRAY(
            SELECT jsonb_array_elements_text(preferred_skills_old::jsonb)
        )
        WHERE preferred_skills_old IS NOT NULL AND preferred_skills_old::text <> ''
    """)
    op.drop_column('posts', 'preferred_skills_old')

    # 3. Convert benefits from JSON to text[]
    op.alter_column('posts', 'benefits', new_column_name='benefits_old')
    op.add_column('posts', sa.Column('benefits', sa.ARRAY(sa.String()), nullable=True))
    op.execute("""
        UPDATE posts
        SET benefits = ARRAY(
            SELECT jsonb_array_elements_text(benefits_old::jsonb)
        )
        WHERE benefits_old IS NOT NULL AND benefits_old::text <> ''
    """)
    op.drop_column('posts', 'benefits_old')


    # Convert requirements from TEXT to text[] only if still TEXT type
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'posts' AND column_name = 'requirements'
                AND data_type = 'text'
            ) THEN
                ALTER TABLE posts
                ALTER COLUMN requirements TYPE text[]
                USING CASE
                    WHEN requirements IS NULL THEN NULL::text[]
                    WHEN requirements = '' THEN ARRAY[]::text[]
                    ELSE ARRAY[requirements]
                END;
            END IF;
        END $$;
    """)

    # Convert preferred_qualifications from TEXT to text[] only if still TEXT type
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'posts' AND column_name = 'preferred_qualifications'
                AND data_type = 'text'
            ) THEN
                ALTER TABLE posts
                ALTER COLUMN preferred_qualifications TYPE text[]
                USING CASE
                    WHEN preferred_qualifications IS NULL THEN NULL::text[]
                    WHEN preferred_qualifications = '' THEN ARRAY[]::text[]
                    ELSE ARRAY[preferred_qualifications]
                END;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE posts
        ALTER COLUMN required_skills TYPE json
        USING CASE
            WHEN required_skills IS NULL THEN NULL::json
            ELSE array_to_json(required_skills)
        END
    """)

    op.execute("""
        ALTER TABLE posts
        ALTER COLUMN preferred_skills TYPE json
        USING CASE
            WHEN preferred_skills IS NULL THEN NULL::json
            ELSE array_to_json(preferred_skills)
        END
    """)

    op.execute("""
        ALTER TABLE posts
        ALTER COLUMN benefits TYPE json
        USING CASE
            WHEN benefits IS NULL THEN NULL::json
            ELSE array_to_json(benefits)
        END
    """)

    op.execute("""
        ALTER TABLE posts
        ALTER COLUMN requirements TYPE text
        USING CASE
            WHEN requirements IS NULL THEN NULL
            ELSE array_to_string(requirements, ', ')
        END
    """)

    op.execute("""
        ALTER TABLE posts
        ALTER COLUMN preferred_qualifications TYPE text
        USING CASE
            WHEN preferred_qualifications IS NULL THEN NULL
            ELSE array_to_string(preferred_qualifications, ', ')
        END
    """)
