from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings"""

    # Application
    APP_NAME: str = "Evalyn"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"   # ✅ FIXED

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://neondb_owner:npg_MPCme14rlwYx@ep-super-darkness-ah973sum-pooler.c-3.us-east-1.aws.neon.tech/neondb"
    )

    # Security
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "your-secret-key-change-in-production"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]

    # Social Media API Endpoints
    LINKEDIN_API_ENDPOINT: str = "https://api.linkedin.com/v2"
    FACEBOOK_API_ENDPOINT: str = "https://graph.facebook.com/v18.0"
    TWITTER_API_ENDPOINT: str = "https://api.twitter.com"
    INSTAGRAM_API_ENDPOINT: str = "https://graph.facebook.com/v18.0"

    # ✅ Pydantic v2 config
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"   # allows extra env variables
    )


settings = Settings()
