import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv(r'd:\git-repo\Evalyn\backend\.env')

async def test_db():
    url = os.getenv("DATABASE_URL")
    print(f"Testing connection to: {url}")
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print(f"Result: {result.scalar()}")
            print("Connection successful!")
    except Exception as e:
        print(f"Connection failed: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_db())
