import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def check_columns():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_integrations'"))
        columns = result.fetchall()
        print("Columns in 'user_integrations' table:")
        for col in columns:
            print(f"- {col[0]} ({col[1]})")

if __name__ == "__main__":
    asyncio.run(check_columns())
