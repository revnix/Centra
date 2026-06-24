
import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def full_inspection():
    async with engine.connect() as conn:
        print("--- FULL SCHEMA INSPECTION ---")
        result = await conn.execute(text("""
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position;
        """))
        current_table = ""
        for row in result:
            if row[0] != current_table:
                current_table = row[0]
                print(f"\nTable: {current_table}")
            print(f"  - {row[1]}: {row[2]}")

if __name__ == "__main__":
    asyncio.run(full_inspection())
