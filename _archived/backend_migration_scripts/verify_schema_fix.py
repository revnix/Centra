import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def check_schema():
    async with engine.connect() as conn:
        try:
            result = await conn.execute(text("SELECT platform_user_id FROM user_integrations LIMIT 1"))
            print("Successfully queried platform_user_id column.")
        except Exception as e:
            print(f"Column missing or error: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema())
