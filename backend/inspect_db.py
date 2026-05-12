
import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def inspect_db():
    async with engine.connect() as conn:
        print("--- Columns in 'posts' table ---")
        result = await conn.execute(text("""
            SELECT column_name, data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'posts'
            ORDER BY ordinal_position;
        """))
        for row in result:
            print(f"{row[0]}: {row[1]} ({row[2]})")

        print("\n--- Enum Values for 'jobtype' ---")
        result = await conn.execute(text("""
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'jobtype';
        """))
        for row in result:
            print(f"- {row[0]}")

        print("\n--- Enum Values for 'experiencelevel' ---")
        result = await conn.execute(text("""
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'experiencelevel';
        """))
        for row in result:
            print(f"- {row[0]}")

        print("\n--- Enum Values for 'jobstatus' ---")
        result = await conn.execute(text("""
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'jobstatus';
        """))
        for row in result:
            print(f"- {row[0]}")

if __name__ == "__main__":
    asyncio.run(inspect_db())
