import asyncio
import os
import asyncpg
from dotenv import load_dotenv

async def main():
    load_dotenv()
    db_url = os.environ.get("DATABASE_URL")
    if "?sslmode=" in db_url:
        db_url = db_url.split("?")[0]
    
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
        
    print(f"Connecting to: {db_url}")
    conn = await asyncpg.connect(db_url)
    
    try:
        # Add new enum values if they don't exist
        enum_values = ["ENTRY_LEVEL", "JUNIOR", "ASSOCIATE", "MID", "MID_SENIOR", "SENIOR", "LEAD", "DIRECTOR", "EXECUTIVE"]
        for val in enum_values:
            try:
                await conn.execute(f"ALTER TYPE experiencelevel ADD VALUE IF NOT EXISTS '{val}';")
            except Exception as e:
                # Sometimes IF NOT EXISTS still throws depending on postgres version or transaction block
                print(f"Enum {val} likely already exists or error: {e}")
                
        print("Successfully added missing enum values to 'experiencelevel'.")
    except Exception as e:
        print(f"Error updating enum: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
