"""convert_array_columns_from_json_to_text_array

Revision ID: c3d4e5f6a7b8
Revises: f1e2d3c4b5a6
Create Date: 2026-06-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'f1e2d3c4b5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Convert required_skills from JSON to text[]
    op.execute("""
        ALTER TABLE posts
        ALTER COLUMN required_skills TYPE text[]
        USING CASE
            WHEN required_skills IS NULL THEN NULL::text[]
            ELSE ARRAY(SELECT jsonb_array_elements_text(required_skills::jsonb))
        END
    """)

    # Convert preferred_skills from JSON to text[]
    op.execute("""
        ALTER TABLE posts
        ALTER COLUMN preferred_skills TYPE text[]
        USING CASE
            WHEN preferred_skills IS NULL THEN NULL::text[]
            ELSE ARRAY(SELECT jsonb_array_elements_text(preferred_skills::jsonb))
        END
    """)

    # Convert benefits from JSON to text[]
    op.execute("""
        ALTER TABLE posts
        ALTER COLUMN benefits TYPE text[]
        USING CASE
            WHEN benefits IS NULL THEN NULL::text[]
            ELSE ARRAY(SELECT jsonb_array_elements_text(benefits::jsonb))
        END
    """)

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
    # Convert text[] back to JSON for required_skills, preferred_skills, benefits
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

    # Convert text[] back to TEXT for requirements, preferred_qualifications
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
