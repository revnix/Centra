import asyncio
import sqlalchemy as sa
from src.app.db.session import engine

async def main():
    async with engine.begin() as conn:
        await conn.execute(sa.text("DELETE FROM alembic_version"))
        await conn.execute(sa.text("INSERT INTO alembic_version (version_num) VALUES ('415d180cf82c'), ('c3d4e5f6a7b8')"))
        print("Restored alembic_version to heads 415d180cf82c and c3d4e5f6a7b8")

if __name__ == "__main__":
    asyncio.run(main())
