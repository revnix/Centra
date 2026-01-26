import asyncio
from src.api.db.session import AsyncSessionLocal
from src.api.models.user import User, UserRole
from sqlalchemy.future import select

async def create_default_user():
    async with AsyncSessionLocal() as db:
        # Check if user exists
        result = await db.execute(select(User).where(User.email == "test@example.com"))
        user = result.scalars().first()
        
        if not user:
            print("Creating default user...")
            new_user = User(
                email="test@example.com",
                hashed_password="hashed_secret",  # In real app, hash this properly
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)
            print(f"Created user with ID: {new_user.id}")
        else:
            print(f"Default user already exists with ID: {user.id}")

if __name__ == "__main__":
    asyncio.run(create_default_user())
