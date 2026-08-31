import asyncio
import sqlalchemy as sa
from src.app.db.session import engine

async def main():
    async with engine.begin() as conn:
        await conn.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'HR'"))
        await conn.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'EMPLOYEE'"))
        print("Successfully added HR and EMPLOYEE to userrole enum in postgres.")

if __name__ == "__main__":
    asyncio.run(main())
