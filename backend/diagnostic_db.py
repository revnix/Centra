import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import time
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def check():
    print(f"Connecting to: {DATABASE_URL.split('@')[-1]}")
    
    # Matching session.py logic
    connect_args = {}
    if "asyncpg" in DATABASE_URL:
        # Strip all query parameters for asyncpg as it handles them via connect_args
        clean_url = DATABASE_URL
        if "?" in clean_url:
            clean_url = clean_url.split("?")[0]
        
    if "neon.tech" in DATABASE_URL:
        connect_args["ssl"] = "require"
        connect_args["command_timeout"] = 60 
        connect_args["statement_cache_size"] = 0

    engine = create_async_engine(clean_url, connect_args=connect_args)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    start = time.time()
    try:
        async with async_session() as session:
            print("Querying applications...")
            result = await session.execute(text("SELECT count(*) FROM applications"))
            count = result.scalar()
            print(f"Total applications: {count}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()
    
    end = time.time()
    print(f"Time taken: {end - start:.2f} seconds")

if __name__ == "__main__":
    asyncio.run(check())
