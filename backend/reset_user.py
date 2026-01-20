import asyncio
from src.api.db.session import AsyncSessionLocal
from src.api.models.user import User, UserRole
from src.api.core.security import get_password_hash
from sqlalchemy.future import select

async def reset_user():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "test@example.com"))
        user = result.scalars().first()
        
        hashed = get_password_hash("secret123")
        
        if not user:
            print("Creating test user...")
            user = User(
                email="test@example.com",
                full_name="Test User",
                hashed_password=hashed,
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(user)
        else:
            print("Updating test user...")
            user.hashed_password = hashed
            user.full_name = "Test User"
            user.role = UserRole.ADMIN
            
        await db.commit()
        print("Done. User test@example.com password set to 'secret123'")

if __name__ == "__main__":
    asyncio.run(reset_user())
