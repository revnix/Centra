
import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def inspect_applications():
    async with engine.connect() as conn:
        print("--- Columns in 'applications' table ---")
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'applications'
            ORDER BY ordinal_position;
        """))
        for row in result:
            print(f"{row[0]}: {row[1]}")

if __name__ == "__main__":
    asyncio.run(inspect_applications())
