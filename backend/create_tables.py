import asyncio
import sys
sys.path.insert(0, '/app')

async def main():
    from src.api.db.session import engine
    from src.api.db.base import Base
    import src.api.models
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Tables created successfully!')

asyncio.run(main())
