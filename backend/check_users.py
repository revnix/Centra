import asyncio
from src.api.db.session import engine
from src.api.models.user import User
from sqlalchemy import select

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(select(User).where(User.email == 'razaali009123@gmail.com'))
        rows = result.fetchall()
        print(f"Users found with email 'razaali009123@gmail.com': {len(rows)}")
        for row in rows:
            print(f"ID: {row.id}, Role: {row.role}, Name: {row.full_name}")

if __name__ == "__main__":
    asyncio.run(check())
