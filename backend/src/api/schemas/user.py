from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Optional, Any
from src.api.models.user import UserRole
from pydantic_core import PydanticCustomError

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    model_config = ConfigDict(use_enum_values=True)

class UserCreate(UserBase):
    username: Optional[str] = None
    password: str
    role: UserRole = UserRole.GUEST

    @field_validator("role", mode="before")
    @classmethod
    def validate_role(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower()
        return v

class UserLogin(BaseModel): 
    email: EmailStr
    password: str
    model_config = ConfigDict(use_enum_values=True)

from src.api.schemas.candidate import CandidateProfileResponse

class UserResponse(UserBase):
    id: int
    username: str
    role: UserRole
    is_active: bool
    candidate_profile: Optional[CandidateProfileResponse] = None

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