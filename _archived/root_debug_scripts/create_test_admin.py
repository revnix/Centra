
import asyncio
from src.api.db.session import AsyncSessionLocal
from src.api.models.user import User, UserRole
from src.api.core.security import get_password_hash
from sqlalchemy.future import select

async def create_admin():
    async with AsyncSessionLocal() as db:
        email = "admin@example.com"
        password = "password"
        
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if not user:
            print(f"Creating admin user {email}...")
            new_user = User(
                email=email,
                username="admin_company",
                full_name="Admin User",
                hashed_password=get_password_hash(password),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(new_user)
            await db.commit()
            print("Admin created.")
        else:
            print("Admin already exists. Updating password...")
            user.hashed_password = get_password_hash(password)
            db.add(user)
            await db.commit()
            print("Password updated.")

if __name__ == "__main__":
    asyncio.run(create_admin())
