import asyncio
from src.api.db.session import engine
from sqlalchemy import text

async def run():
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE applications ADD COLUMN IF NOT EXISTS qualification VARCHAR(200);'))
    print('Qualification column added successfully.')

if __name__ == '__main__':
    asyncio.run(run())
