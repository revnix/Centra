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
        "DATABASE_URL"
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
        "http://172.22.112.1:3000",  # Network IP for frontend
        "http://172.22.112.1:2024",  # Network IP for backend
    ]

    # Social Media API Endpoints
    LINKEDIN_API_ENDPOINT: str = "https://api.linkedin.com/v2"
    LINKEDIN_CLIENT_ID: str = os.getenv("LINKEDIN_CLIENT_ID", "")
    LINKEDIN_CLIENT_SECRET: str = os.getenv("LINKEDIN_CLIENT_SECRET", "")
    LINKEDIN_REDIRECT_URI: str = os.getenv("LINKEDIN_REDIRECT_URI", "http://localhost:8000/auth/linkedin/callback")
    

    
    FACEBOOK_API_ENDPOINT: str = "https://graph.facebook.com/v18.0"
    TWITTER_API_ENDPOINT: str = "https://api.twitter.com"
    INSTAGRAM_API_ENDPOINT: str = "https://graph.facebook.com/v18.0"

    # Indeed API
    INDEED_CLIENT_ID: str = os.getenv("INDEED_CLIENT_ID", "")
    INDEED_CLIENT_SECRET: str = os.getenv("INDEED_CLIENT_SECRET", "")
    INDEED_EMPLOYER_ID: str = os.getenv("INDEED_EMPLOYER_ID", "")
    INDEED_REDIRECT_URI: str = os.getenv("INDEED_REDIRECT_URI", "http://localhost:3000/callback")
    INDEED_API_ENDPOINT: str = "https://apis.indeed.com"
    INDEED_AUTH_URL: str = "https://apis.indeed.com/oauth/v2/authorize"
    INDEED_TOKEN_URL: str = "https://apis.indeed.com/oauth/v2/tokens"

    # ✅ Pydantic v2 config
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"   # allows extra env variables
    )


settings = Settings()
