import asyncio
import sys
from sqlalchemy.future import select
from src.api.db.session import engine, AsyncSessionLocal
from src.api.models.user import User

async def check_users():
    print("STARTING SCRIPT", flush=True)
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        print(f"COUNT: {len(users)}", flush=True)
        for u in users:
            print(f"USER: id={u.id}, email={u.email}, username={u.username}", flush=True)
    print("FINISHED", flush=True)

if __name__ == "__main__":
    asyncio.run(check_users())
