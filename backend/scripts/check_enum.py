import asyncio
import sqlalchemy as sa
from src.app.db.session import engine

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(sa.text("SELECT enum_range(NULL::userrole)"))
        print("USERROLE ENUM:", res.fetchall())
        
        res2 = await conn.execute(sa.text("SELECT DISTINCT role FROM users"))
        print("USERS ROLES IN DB:", res2.fetchall())

if __name__ == "__main__":
    asyncio.run(main())
