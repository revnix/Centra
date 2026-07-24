import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'applicationstatus';
        """))
        print("Enum values:")
        for r in res:
            print(f"- {r[0]}")

asyncio.run(check())
