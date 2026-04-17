import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def migrate_postgres():
    print("Connecting to PostgreSQL and running migrations...")
    async with engine.begin() as conn:
        try:
            # 1. Update Enum Type
            print("Adding PENDING_INDUCTION to OnboardingStatus Enum...")
            await conn.execute(text("ALTER TYPE onboardingstatus ADD VALUE 'PENDING_INDUCTION';"))
        except Exception as e:
            print(f"Enum might already exist or error: {e}")

        # 2. Add Columns
        columns_to_add = [
            "ind_hr_welcome_session",
            "ind_hr_handbook_shared",
            "ind_hr_policies_explained",
            "ind_it_credentials_provided",
            "ind_it_security_induction",
            "ind_manager_buddy_assigned",
            "ind_manager_team_intro"
        ]
        
        for col in columns_to_add:
            try:
                print(f"Adding column {col}...")
                await conn.execute(text(f"ALTER TABLE onboardings ADD COLUMN {col} BOOLEAN DEFAULT FALSE;"))
            except Exception as e:
                print(f"Error adding column {col} (might already exist): {e}")

    print("PostgreSQL migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate_postgres())
