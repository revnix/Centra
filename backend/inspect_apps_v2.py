
import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def inspect_applications():
    async with engine.connect() as conn:
        print("--- Detailed columns in 'applications' table ---")
        result = await conn.execute(text("""
            SELECT a.attname AS column_name, format_type(a.atttypid, a.atttypmod) AS data_type
            FROM pg_attribute a
            JOIN pg_class t ON a.attrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            WHERE t.relname = 'applications'
            AND n.nspname = 'public'
            AND a.attnum > 0
            AND NOT a.attisdropped;
        """))
        for row in result:
            print(f"{row[0]}: {row[1]}")

if __name__ == "__main__":
    asyncio.run(inspect_applications())
