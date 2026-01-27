from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.db.session import get_db
from src.api.services.auth_service import AuthService
from src.api.schemas.user import UserCreate, UserResponse, Token, UserRegisterResponse, UserLogin
from src.api.models.user import User
from src.api.core.security import create_access_token
from src.api.core.dependencies import get_current_user

router = APIRouter()

@router.post("/register", response_model=UserRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        auth_service = AuthService(db)
        existing_user = await auth_service.get_user_by_email(user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="The user with this email already exists in the system.",
            )
        user = await auth_service.create_user(user_in)
        
        # Generate token for immediate login after registration
        access_token = create_access_token(subject=user.email, username=user.username, role=user.role.value)
        
        # FIXED: Response structure must match UserRegisterResponse schema
        # UserRegisterResponse has 'user' and 'access_token' (which is of type Token)
        # Token schema has 'access_token', 'token_type', and 'user'
        token_data = {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }
        
        return {"user": user, "access_token": token_data}
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"ERROR captured: {tb}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}\n{tb}")

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    user = await auth_service.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    access_token = create_access_token(subject=user.email, username=user.username, role=user.role.value)
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user
    }
