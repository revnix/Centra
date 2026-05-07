"""create_onboarding_tables

Revision ID: a1b2c3d4e5f6
Revises: d976a6fd4f06
Create Date: 2026-05-05 14:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'd976a6fd4f06'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create onboardings and onboarding_documents tables."""

    # Create onboardingstatus enum (safe - only creates if not exists)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE onboardingstatus AS ENUM (
                'PENDING_CANDIDATE_JOINING',
                'PENDING_HR_DETAILS',
                'PENDING_CANDIDATE_DOCS',
                'PENDING_HR_DOCS',
                'PENDING_IT_SETUP',
                'PENDING_INDUCTION',
                'COMPLETED'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create shifttiming enum (safe - only creates if not exists)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE shifttiming AS ENUM (
                '1st Shift',
                '2nd Shift',
                '3rd Shift'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS onboardings (
            id              SERIAL PRIMARY KEY,
            application_id  INTEGER NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
            user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            onboarding_token VARCHAR UNIQUE,

            status          onboardingstatus NOT NULL DEFAULT 'PENDING_CANDIDATE_JOINING',

            -- Candidate details
            joining_date        TIMESTAMPTZ,
            reporting_time      VARCHAR(50),
            office_location     VARCHAR(255),
            shift_timing        shifttiming,

            -- Documents
            doc_front_picture_url           VARCHAR,
            doc_id_card_url                 VARCHAR,
            doc_salary_slip_url             VARCHAR,
            doc_experience_letter_url       VARCHAR,
            doc_educational_documents_url   VARCHAR,
            doc_police_clearance_url        VARCHAR,
            doc_resume_url                  VARCHAR,
            doc_additional_files_json       VARCHAR,

            -- Personal Info
            cnic_number         VARCHAR(50),
            phone_number        VARCHAR(50),
            current_address     VARCHAR,
            emergency_contact   VARCHAR(100),
            bank_name           VARCHAR(100),
            bank_iban           VARCHAR(100),

            -- HR verification
            hr_verified         BOOLEAN DEFAULT FALSE,

            -- IT Setup
            it_slack_setup          BOOLEAN DEFAULT FALSE,
            it_gmail_setup          BOOLEAN DEFAULT FALSE,
            it_browser_extensions   BOOLEAN DEFAULT FALSE,
            it_gmail_signature      BOOLEAN DEFAULT FALSE,
            it_bordio_access        BOOLEAN DEFAULT FALSE,
            it_office365_access     BOOLEAN DEFAULT FALSE,

            -- Induction checklists
            ind_hr_welcome_session      BOOLEAN DEFAULT FALSE,
            ind_hr_handbook_shared      BOOLEAN DEFAULT FALSE,
            ind_hr_policies_explained   BOOLEAN DEFAULT FALSE,
            ind_it_credentials_provided BOOLEAN DEFAULT FALSE,
            ind_it_security_induction   BOOLEAN DEFAULT FALSE,
            ind_manager_buddy_assigned  BOOLEAN DEFAULT FALSE,
            ind_manager_team_intro      BOOLEAN DEFAULT FALSE,

            created_at  TIMESTAMPTZ DEFAULT now(),
            updated_at  TIMESTAMPTZ
        )
    """)

    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_onboardings_id "
        "ON onboardings (id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_onboardings_onboarding_token "
        "ON onboardings (onboarding_token)"
    )

    op.execute("""
        CREATE TABLE IF NOT EXISTS onboarding_documents (
            id              SERIAL PRIMARY KEY,
            application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
            file_name       VARCHAR(255) NOT NULL,
            file_url        VARCHAR NOT NULL,
            file_type       VARCHAR(50) NOT NULL,
            uploaded_at     TIMESTAMPTZ DEFAULT now()
        )
    """)

    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_onboarding_documents_id "
        "ON onboarding_documents (id)"
    )


def downgrade() -> None:
    """Drop onboarding tables and types."""
    op.execute("DROP TABLE IF EXISTS onboarding_documents")
    op.execute("DROP INDEX IF EXISTS ix_onboardings_onboarding_token")
    op.execute("DROP INDEX IF EXISTS ix_onboardings_id")
    op.execute("DROP TABLE IF EXISTS onboardings")
    op.execute("DROP TYPE IF EXISTS shifttiming")
    op.execute("DROP TYPE IF EXISTS onboardingstatus")
