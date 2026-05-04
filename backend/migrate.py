import asyncio, sys
sys.path.insert(0, '/app')
from sqlalchemy import text

async def main():
    from src.api.db.session import engine
    commands = [
        "ALTER TABLE posts ADD COLUMN IF NOT EXISTS requirements TEXT",
        "ALTER TABLE posts ADD COLUMN IF NOT EXISTS preferred_qualifications TEXT",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS source VARCHAR",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS city VARCHAR",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS qualification VARCHAR",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS expected_salary VARCHAR",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS salary_filter_status VARCHAR",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS email_delivery_status VARCHAR",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS email_logs JSONB",
    ]
    async with engine.begin() as conn:
        for cmd in commands:
            await conn.execute(text(cmd))
            print(f"Done: {cmd[:50]}")
    print("All columns added!")

asyncio.run(main())
