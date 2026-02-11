from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from src.api.models.user import User
from src.api.schemas.user import UserCreate
from src.api.core.security import get_password_hash, verify_password

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_email(self, email: str) -> User | None:
        result = await self.db.execute(
            select(User)
            .where(User.email == email)
            .options(joinedload(User.candidate_profile))
        )
        return result.scalars().first()

    async def get_user_by_username(self, username: str) -> User | None:
        result = await self.db.execute(
            select(User)
            .where(User.username == username)
            .options(joinedload(User.candidate_profile))
        )
        return result.scalars().first()

    async def create_user(self, user_in: UserCreate) -> User:
        hashed_password = get_password_hash(user_in.password)
        
        base_username = user_in.username or user_in.email.split("@")[0]
        username = base_username
        counter = 1
        
        # Check for username collision and handle it
        while await self.get_user_by_username(username):
            username = f"{base_username}{counter}"
            counter += 1

        db_user = User(
            email=user_in.email,
            username=username,
            full_name=user_in.full_name,
            hashed_password=hashed_password,
            role=user_in.role
        )
        self.db.add(db_user)
        try:
            await self.db.commit()
        except Exception:
            await self.db.rollback()
            raise
            
        # Explicitly reload without triggering lazy loads of relationships
        await self.db.refresh(db_user)
        return db_user

    async def authenticate_user(self, email: str, password: str) -> User | None:
        user = await self.get_user_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user