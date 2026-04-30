import asyncio
from src.api.db.session import engine
from sqlalchemy import text

async def run():
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE applications ADD COLUMN IF NOT EXISTS city VARCHAR(100);'))
    print('Column added successfully.')

if __name__ == '__main__':
    asyncio.run(run())
