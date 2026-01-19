from pydantic import BaseModel, EmailStr
from typing import Optional
from src.api.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.GUEST

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class UserRegisterResponse(BaseModel):
    user: UserResponse
    access_token: Token

class TokenData(BaseModel):
    email: Optional[str] = None