import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def run_migration():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env")
        return

    # Convert sqlalchemy url to asyncpg url (remove postgresql+asyncpg://)
    url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    
    print(f"Connecting to database...")
    try:
        conn = await asyncpg.connect(url)
        
        # Add new enum values to experiencelevel
        new_levels = ['JUNIOR', 'MID', 'SENIOR', 'LEAD']
        for level in new_levels:
            print(f"Adding '{level}' to experiencelevel enum...")
            try:
                # ALTER TYPE ... ADD VALUE cannot run inside a transaction block in some versions
                # but asyncpg runs commands as transactions by default unless specified
                await conn.execute(f"ALTER TYPE experiencelevel ADD VALUE IF NOT EXISTS '{level}'")
                print(f"Successfully added '{level}'")
            except Exception as e:
                print(f"Note/Error adding '{level}': {e}")

        # Ensure columns exist (just in case)
        await conn.execute("ALTER TABLE posts ADD COLUMN IF NOT EXISTS requirements VARCHAR[]")
        await conn.execute("ALTER TABLE posts ADD COLUMN IF NOT EXISTS preferred_qualifications VARCHAR[]")

        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
