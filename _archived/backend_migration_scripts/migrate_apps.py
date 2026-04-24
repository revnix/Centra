import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def migrate_applications():
    print("Starting applications migration...")
    async with engine.begin() as conn:
        columns_to_add = [
            ("phone_number", "VARCHAR(50)"),
            ("cover_letter", "TEXT"),
        ]

        for col_name, col_type in columns_to_add:
            try:
                print(f"Adding column '{col_name}' to 'applications' table...")
                await conn.execute(text(f"ALTER TABLE applications ADD COLUMN {col_name} {col_type};"))
                print(f"Success: Added {col_name}")
            except Exception as e:
                print(f"Note: Could not add column {col_name} (it might already exist): {e}")

    print("Migration finished!")

if __name__ == "__main__":
    asyncio.run(migrate_applications())
