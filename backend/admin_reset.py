
import asyncio
import sys
import os

# Add current directory to python path
sys.path.append(os.getcwd())

from src.api.db.session import AsyncSessionLocal
from src.api.models.user import User, UserRole
from src.api.core.security import get_password_hash
from sqlalchemy.future import select

async def create_admin():
    print("Connecting to database...")
    async with AsyncSessionLocal() as db:
        email = "admin@example.com"
        password = "password"
        
        print(f"Checking for user: {email}")
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if not user:
            print(f"User not found. Creating admin user {email}...")
            hashed = get_password_hash(password)
            new_user = User(
                email=email,
                username="admin_company",
                full_name="Admin User",
                hashed_password=hashed,
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(new_user)
            await db.commit()
            print("Admin created successfully.")
        else:
            print("Admin already exists. Updating password...")
            hashed = get_password_hash(password)
            user.hashed_password = hashed
            # Ensure active
            user.is_active = True
            db.add(user)
            await db.commit()
            print("Password updated successfully.")

if __name__ == "__main__":
    asyncio.run(create_admin())
