
import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def check_schema():
    async with engine.begin() as conn:
        result = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='onboardings';"
        ))
        columns = [row[0] for row in result.fetchall()]
        print("Columns in 'onboardings' table:")
        for col in sorted(columns):
            print(f"- {col}")

if __name__ == "__main__":
    asyncio.run(check_schema())
