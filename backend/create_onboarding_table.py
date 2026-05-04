import asyncio
from src.api.db.session import engine
from src.api.db.base import Base

# Import all models to ensure they are registered with Base.metadata before creating tables
import src.api.models.__init__

async def create_tables():
    print("Creating missing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully!")

if __name__ == "__main__":
    asyncio.run(create_tables())
