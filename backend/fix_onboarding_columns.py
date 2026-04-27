import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def migrate():
    columns_to_add = [
        ("doc_educational_documents_url", "VARCHAR"),
        ("doc_police_clearance_url", "VARCHAR"),
        ("doc_resume_url", "VARCHAR"),
        ("doc_additional_files_json", "VARCHAR"),
    ]
    
    async with engine.begin() as conn:
        for col_name, col_type in columns_to_add:
            try:
                # Check if column exists (PostgreSQL specific check)
                result = await conn.execute(text(
                    f"SELECT column_name FROM information_schema.columns WHERE table_name='onboardings' AND column_name='{col_name}';"
                ))
                exists = result.fetchone()
                
                if not exists:
                    print(f"Adding column: {col_name}")
                    await conn.execute(text(
                        f"ALTER TABLE onboardings ADD COLUMN {col_name} {col_type}"
                    ))
                    print(f"Successfully added column: {col_name}")
                else:
                    print(f"Column already exists: {col_name}")
            except Exception as e:
                print(f"Error processing column {col_name}: {str(e)}")

    print("\nMigration script finished.")

if __name__ == "__main__":
    asyncio.run(migrate())
