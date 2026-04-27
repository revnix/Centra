import asyncio
from src.api.db.session import engine
from sqlalchemy import text

async def alter_enum():
    print("Fixing PostgreSQL ENUM 'onboardingstatus'...")
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TYPE onboardingstatus ADD VALUE IF NOT EXISTS 'PENDING_CANDIDATE_JOINING'"))
            await conn.execute(text("ALTER TYPE onboardingstatus ADD VALUE IF NOT EXISTS 'PENDING_HR_DETAILS'"))
            await conn.execute(text("ALTER TYPE onboardingstatus ADD VALUE IF NOT EXISTS 'PENDING_CANDIDATE_DOCS'"))
            print("Successfully added new stages to onboardingstatus ENUM!")
    except Exception as e:
        print(f"Error altering enum (It may be SQLite or values already exist): {e}")

if __name__ == "__main__":
    asyncio.run(alter_enum())
