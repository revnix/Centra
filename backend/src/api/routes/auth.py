from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.db.session import get_db
from src.api.services.auth_service import AuthService
from src.api.services.email_service import EmailService
from src.api.schemas.user import (
    UserCreate, UserResponse, Token, 
    UserRegisterResponse, UserLogin, 
    ForgotPasswordRequest, ResetPasswordRequest
)
from src.api.models.user import User
from src.api.core.security import create_access_token
from src.api.core.dependencies import get_current_user
from src.api.core.config import settings

router = APIRouter()

@router.post("/register", response_model=UserRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    existing_user = await auth_service.get_user_by_email(user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
        
    if user_in.username:
        existing_username = await auth_service.get_user_by_username(user_in.username)
        if existing_username:
            raise HTTPException(
                status_code=400,
                detail="This username is already taken.",
            )
            
    user = await auth_service.create_user(user_in)
    
    # Generate token for immediate login after registration
    access_token = create_access_token(subject=user.email, username=user.username, role=user.role)
    token = {"access_token": access_token, "token_type": "bearer", "user": user}
    
    return {"user": user, "access_token": token}

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    user = await auth_service.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    access_token = create_access_token(subject=user.email, username=user.username, role=user.role)
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    user = await auth_service.get_user_by_email(request.email)
    
    if not user:
        # We return success even if user doesn't exist for security reasons (don't leak emails)
        return {"message": "If an account with that email exists, we have sent a reset link."}
        
    token = await auth_service.create_password_reset_token(user.id)
    
    # Use frontend URL from settings or default to localhost
    frontend_url = settings.FRONTEND_URL if hasattr(settings, "FRONTEND_URL") else "http://localhost:3000"
    reset_link = f"{frontend_url}/reset-password?token={token}"
    
    EmailService.send_password_reset_email(user.email, reset_link)
    
    return {"message": "If an account with that email exists, we have sent a reset link."}

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    success = await auth_service.reset_password(request.token, request.new_password)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
        
    return {"message": "Password reset successful. You can now login with your new password."}
