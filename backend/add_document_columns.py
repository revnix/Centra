"""
Migration script to add new document columns to the onboardings table.
Adds: doc_educational_documents_url, doc_police_clearance_url
"""
import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def add_columns():
    async with engine.begin() as conn:
        # Add doc_educational_documents_url column
        try:
            await conn.execute(text(
                "ALTER TABLE onboardings ADD COLUMN doc_educational_documents_url VARCHAR"
            ))
            print("✅ Added column: doc_educational_documents_url")
        except Exception as e:
            print(f"⚠️ doc_educational_documents_url: {e}")

        # Add doc_police_clearance_url column
        try:
            await conn.execute(text(
                "ALTER TABLE onboardings ADD COLUMN doc_police_clearance_url VARCHAR"
            ))
            print("✅ Added column: doc_police_clearance_url")
        except Exception as e:
            print(f"⚠️ doc_police_clearance_url: {e}")

    print("\n🎉 Migration complete!")

if __name__ == "__main__":
    asyncio.run(add_columns())
