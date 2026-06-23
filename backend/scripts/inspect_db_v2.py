
import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def inspect_db():
    async with engine.connect() as conn:
        print("--- Missing/Suspect Columns in 'posts' table ---")
        # Check benefits, tags, and others
        result = await conn.execute(text("""
            SELECT column_name, data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'posts' 
            AND column_name IN ('benefits', 'tags', 'required_skills', 'preferred_skills', 'requirements', 'preferred_qualifications')
            ORDER BY column_name;
        """))
        for row in result:
            print(f"{row[0]}: {row[1]} ({row[2]})")

if __name__ == "__main__":
    asyncio.run(inspect_db())
