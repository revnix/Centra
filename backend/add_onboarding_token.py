import asyncio
from src.api.db.session import engine
from sqlalchemy import text

async def alter_table():
    async with engine.connect() as conn:
        try:
            await conn.execute(text("ALTER TABLE onboardings ADD COLUMN onboarding_token VARCHAR;"))
            await conn.commit()
            print("Successfully added onboarding_token column to onboardings table.")
        except Exception as e:
            if "already exists" in str(e):
                print("Column onboarding_token already exists.")
            else:
                print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(alter_table())
