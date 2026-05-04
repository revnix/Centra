import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def migrate():
    if not DATABASE_URL:
        print("DATABASE_URL not found in .env")
        return

    # asyncpg doesn't like the 'postgresql+asyncpg://' prefix or 'sslmode' in the string
    # it prefers 'postgres://' or 'postgresql://' and separate ssl param
    url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    
    # Simple way: just remove query params for the connect call if they cause issues
    if "?" in url:
        url = url.split("?")[0]

    print(f"Connecting to {url.split('@')[-1]}...")
    
    try:
        conn = await asyncpg.connect(url, ssl='require')
        
        # Check if manager_feedback exists
        print("Checking for manager_feedback column in posts table...")
        row = await conn.fetchrow("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'posts' AND column_name = 'manager_feedback';
        """)
        
        if not row:
            print("Adding manager_feedback column to posts table...")
            await conn.execute("ALTER TABLE posts ADD COLUMN manager_feedback TEXT;")
            print("Column added successfully.")
        else:
            print("manager_feedback column already exists.")

        await conn.close()
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
