import asyncio
from src.api.db.session import engine
from sqlalchemy import text

async def alter_enum():
    print("Fixing PostgreSQL ENUM 'applicationstatus'...")
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TYPE applicationstatus ADD VALUE IF NOT EXISTS 'ONBOARDING'"))
            print("Successfully added 'ONBOARDING' to applicationstatus ENUM!")
    except Exception as e:
        print(f"Error altering enum: {e}")

if __name__ == "__main__":
    asyncio.run(alter_enum())
