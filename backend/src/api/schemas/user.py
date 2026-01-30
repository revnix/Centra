from pydantic import BaseModel, EmailStr
from typing import Optional
from src.api.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    username: Optional[str] = None
    password: str
    role: UserRole = UserRole.GUEST

class UserLogin(BaseModel): # Modified to not inherit from UserBase if email is only field needed, but email is in UserBase.
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    username: str
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class UserRegisterResponse(BaseModel):
    user: UserResponse
    access_token: Token

class TokenData(BaseModel):
    email: Optional[str] = None