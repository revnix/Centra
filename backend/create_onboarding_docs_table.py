import asyncio
from src.api.db.session import engine
from src.api.models.onboarding import Base
from sqlalchemy import text

async def create_onboarding_docs_table():
    async with engine.begin() as conn:
        # Create the table if it doesn't exist
        await conn.run_sync(Base.metadata.create_all)
        print("Ensured onboarding_documents table exists.")

if __name__ == "__main__":
    asyncio.run(create_onboarding_docs_table())
