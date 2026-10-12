import asyncio
import sqlalchemy as sa
from src.app.db.session import engine

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(sa.text("SELECT version_num FROM alembic_version"))
        print("ALEMBIC VERSION IN DB:", res.fetchall())

if __name__ == "__main__":
    asyncio.run(main())
