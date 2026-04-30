import asyncio
from src.api.db.session import engine
from src.api.db.base import Base
from src.api.models.password_reset import PasswordResetToken

async def create_tables():
    print("Creating password_reset_tokens table...")
    async with engine.begin() as conn:
        # This will create all tables defined in models that don't exist yet
        await conn.run_sync(Base.metadata.create_all)
    print("Done!")

if __name__ == "__main__":
    asyncio.run(create_tables())
