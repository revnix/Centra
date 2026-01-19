import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Optional, Any, Union

from src.api.core.config import settings

ALGORITHM = "HS256"


# ------------------------------------------------------------------
# JWT TOKEN
# ------------------------------------------------------------------

def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    expire = datetime.utcnow() + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# ------------------------------------------------------------------
# PASSWORD HASHING
# ------------------------------------------------------------------

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if isinstance(plain_password, str):
        plain_password = plain_password.encode("utf-8")
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode("utf-8")

    return bcrypt.checkpw(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    password = password.encode("utf-8")
    hashed = bcrypt.hashpw(password, bcrypt.gensalt())
    return hashed.decode("utf-8")
