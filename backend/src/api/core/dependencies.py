from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
# from jose import JWTError removed
# I need to be careful with imports. I used 'import jwt' in security.py.
# But OAuth2 uses python-jose usually in examples? 
# I should import jwt (PyJWT) and handle decoding.

# Let's fix the import logic in my mind before writing.
# Code below uses PyJWT logic.

import jwt
from src.api.core.config import settings
from src.api.core.security import ALGORITHM
from src.api.db.session import get_db
from src.api.services.auth_service import AuthService
from src.api.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        username = payload.get("username")
        role = payload.get("role")
        if not email or not username or not role:
            raise credentials_exception
    except jwt.PyJWTError: # PyJWT specific error
        raise credentials_exception
    
    auth_service = AuthService(db)
    user = await auth_service.get_user_by_email(email)
    if user is None:
        raise credentials_exception
    return user
    

# async def get_current_active_admin(current_user: User = Depends(get_current_user)) -> User:
#     if current_user.role != UserRole.ADMIN:
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN, detail="The user doesn't have enough privileges"
#         )
#     return current_user

async def get_current_active_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

async def get_current_admin_or_reviewer(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user
