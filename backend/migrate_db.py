import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def migrate():
    print("Starting migration...")
    async with engine.begin() as conn:
        # Check if description column exists before renaming
        # This is a bit complex in pure SQL without PL/pgSQL, but we can just try and catch or use information_schema
        
        try:
            print("Renaming 'description' to 'summary'...")
            await conn.execute(text("ALTER TABLE job_postings RENAME COLUMN description TO summary;"))
        except Exception as e:
            print(f"Note: Could not rename description (it might already be renamed): {e}")

        columns_to_add = [
            ("skills", "TEXT"),
            ("responsibilities", "TEXT"),
            ("requirements", "TEXT"),
            ("preferred_qualifications", "TEXT"),
            ("benefits", "TEXT")
        ]

        for col_name, col_type in columns_to_add:
            try:
                print(f"Adding column '{col_name}'...")
                await conn.execute(text(f"ALTER TABLE job_postings ADD COLUMN {col_name} {col_type};"))
            except Exception as e:
                print(f"Note: Could not add column {col_name} (it might already exist): {e}")

    print("Migration finished!")

if __name__ == "__main__":
    asyncio.run(migrate())
