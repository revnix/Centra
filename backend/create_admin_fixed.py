import asyncio
import bcrypt
from src.api.db.session import AsyncSessionLocal
from src.api.models.user import User, UserRole
from sqlalchemy.future import select

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

async def create_admin():
    email = "admin@evalyn.ai"
    password = "Admin123!"
    hashed_password = get_password_hash(password)
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if not user:
            print(f"Creating admin user: {email}")
            new_user = User(
                email=email,
                hashed_password=hashed_password,
                role=UserRole.ADMIN,
                is_active=True,
                username="admin_evalyn"
            )
            db.add(new_user)
            await db.commit()
            print("Admin user created successfully!")
        else:
            print(f"User {email} already exists. Updating password...")
            user.hashed_password = hashed_password
            await db.commit()
            print("Password updated successfully!")

if __name__ == "__main__":
    asyncio.run(create_admin())
