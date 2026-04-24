import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def migrate_email_fields():
    print("🚀 Starting email fields migration for 'applications' table...")
    async with engine.begin() as conn:
        columns_to_add = [
            ("email_delivery_status", "VARCHAR(50) DEFAULT 'PENDING'"),
            ("email_logs", "TEXT"),
        ]

        for col_name, col_type in columns_to_add:
            try:
                print(f"🔹 Adding column '{col_name}'...")
                await conn.execute(text(f"ALTER TABLE applications ADD COLUMN {col_name} {col_type};"))
                print(f"✅ Success: Added {col_name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"ℹ️ Note: Column '{col_name}' already exists. Skipping.")
                else:
                    print(f"❌ Error adding column '{col_name}': {e}")

    print("🏁 Migration finished!")

if __name__ == "__main__":
    asyncio.run(migrate_email_fields())
