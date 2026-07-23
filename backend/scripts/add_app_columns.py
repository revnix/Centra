import asyncio, os, asyncpg
from dotenv import load_dotenv
load_dotenv()
url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
async def main():
    conn = await asyncpg.connect(url)
    await conn.execute('''
        ALTER TABLE applications
        ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'web',
        ADD COLUMN IF NOT EXISTS email_delivery_status VARCHAR(50) DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS email_logs TEXT;
    ''')
    await conn.close()
    print('Columns added successfully')
asyncio.run(main())
