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

    url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    if "?" in url:
        url = url.split("?")[0]

    print(f"Connecting to {url.split('@')[-1]}...")
    
    try:
        conn = await asyncpg.connect(url, ssl='require')
        
        # Check if APPROVED exists in jobstatus enum
        print("Checking jobstatus enum values...")
        rows = await conn.fetch("""
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'jobstatus';
        """)
        
        existing_values = [row['enumlabel'] for row in rows]
        print(f"Existing enum values: {existing_values}")
        
        # Add APPROVED if it doesn't exist
        if 'APPROVED' not in existing_values:
            print("Adding 'APPROVED' to jobstatus enum...")
            # Note: ALTER TYPE ... ADD VALUE cannot be run inside a transaction block
            # asyncpg connect is not in a transaction by default unless we start one
            await conn.execute("ALTER TYPE jobstatus ADD VALUE 'APPROVED';")
            print("'APPROVED' added successfully.")
        
        # Add CHANGES_REQUESTED if it doesn't exist
        if 'CHANGES_REQUESTED' not in existing_values:
            print("Adding 'CHANGES_REQUESTED' to jobstatus enum...")
            await conn.execute("ALTER TYPE jobstatus ADD VALUE 'CHANGES_REQUESTED';")
            print("'CHANGES_REQUESTED' added successfully.")

        await conn.close()
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
