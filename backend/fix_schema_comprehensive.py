
import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def fix_schema():
    async with engine.begin() as conn:
        print("Fixing 'applications' table...")
        await conn.execute(text("ALTER TABLE applications ADD COLUMN IF NOT EXISTS city VARCHAR(100);"))
        await conn.execute(text("ALTER TABLE applications ADD COLUMN IF NOT EXISTS qualification VARCHAR(200);"))
        
        # Fixing email_logs type (from text to jsonb)
        await conn.execute(text("ALTER TABLE applications ALTER COLUMN email_logs TYPE JSONB USING to_jsonb(email_logs);"))
        
        # Fixing expected_salary type (from double precision to varchar)
        await conn.execute(text("ALTER TABLE applications ALTER COLUMN expected_salary TYPE VARCHAR(100) USING expected_salary::VARCHAR;"))

        print("Fixing 'onboardings' table...")
        await conn.execute(text("ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS cnic_number VARCHAR(50);"))
        await conn.execute(text("ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);"))
        await conn.execute(text("ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS current_address TEXT;"))
        await conn.execute(text("ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);"))
        await conn.execute(text("ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);"))
        await conn.execute(text("ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS bank_iban VARCHAR(100);"))

        print("Creating 'onboarding_documents' table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS onboarding_documents (
                id SERIAL PRIMARY KEY,
                application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
                file_name VARCHAR(255) NOT NULL,
                file_url TEXT NOT NULL,
                file_type VARCHAR(50) NOT NULL,
                uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        print("Creating index for onboarding_documents...")
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_onboarding_documents_id ON onboarding_documents (id);"))

    print("Schema fix completed!")

if __name__ == "__main__":
    asyncio.run(fix_schema())
