from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
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
    LOG_LEVEL: str = "INFO"   
    UPLOAD_DIR: str = "uploads"
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # Database
    DATABASE_URL: str = ""

    # Security
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "your-secret-key-change-in-production"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 Days

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "*",  # Allow all origins in dev to avoid CORS errors
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "http://localhost:8123",
        "http://localhost:2024",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8123",
        "http://127.0.0.1:2024",
        "http://172.22.112.1:3000",  # Network IP for frontend
        "http://172.22.112.1:8123",  # Network IP for backend
        "https://evalyn-omega.vercel.app",
        "https://*.vercel.app",
    ]

    # Social Media API Endpoints
    LINKEDIN_API_ENDPOINT: str = "https://api.linkedin.com/v2"
    LINKEDIN_CLIENT_ID: str = os.getenv("LINKEDIN_CLIENT_ID", "")
    LINKEDIN_CLIENT_SECRET: str = os.getenv("LINKEDIN_CLIENT_SECRET", "")
    LINKEDIN_REDIRECT_URI: str = os.getenv("LINKEDIN_REDIRECT_URI", "http://localhost:8000/auth/linkedin/callback")
    

    
    FACEBOOK_API_ENDPOINT: str = "https://graph.facebook.com/v25.0"
    FACEBOOK_APP_ID: str = os.getenv("FACEBOOK_APP_ID", "")
    FACEBOOK_APP_SECRET: str = os.getenv("FACEBOOK_APP_SECRET", "")
    TWITTER_API_ENDPOINT: str = "https://api.twitter.com"
    INSTAGRAM_API_ENDPOINT: str = "https://graph.facebook.com/v18.0"

    # Gmail OAuth
    GMAIL_CLIENT_ID: str = os.getenv("GMAIL_CLIENT_ID", "")
    GMAIL_CLIENT_SECRET: str = os.getenv("GMAIL_CLIENT_SECRET", "")
    GMAIL_REDIRECT_URI: str = os.getenv("GMAIL_REDIRECT_URI", "http://127.0.0.1:8000/api/v1/gmail/callback")

    # Indeed API
    INDEED_CLIENT_ID: str = os.getenv("INDEED_CLIENT_ID", "")
    INDEED_CLIENT_SECRET: str = os.getenv("INDEED_CLIENT_SECRET", "")
    INDEED_EMPLOYER_ID: str = os.getenv("INDEED_EMPLOYER_ID", "")
    INDEED_REDIRECT_URI: str = os.getenv("INDEED_REDIRECT_URI", "http://localhost:3000/callback")
    INDEED_API_ENDPOINT: str = "https://apis.indeed.com"
    INDEED_AUTH_URL: str = "https://apis.indeed.com/oauth/v2/authorize"
    INDEED_TOKEN_URL: str = "https://apis.indeed.com/oauth/v2/tokens"

    # WhatsApp Business API
    WA_PHONE_NUMBER_ID: str = os.getenv("WA_PHONE_NUMBER_ID", "")
    WA_WABA_ID: str = os.getenv("WA_WABA_ID", "")
    WA_ACCESS_TOKEN: str = os.getenv("WA_ACCESS_TOKEN", "")
    WA_VERIFY_TOKEN: str = os.getenv("WA_VERIFY_TOKEN", "")
    WA_API_VERSION: str = "v25.0"
    WA_GRAPH_API_URL: str = f"https://graph.facebook.com/{WA_API_VERSION}"

    # Email Settings (Resend)
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "onboarding@resend.dev"
    RESEND_FROM_NAME: str = "Evalyn"
    
    # Aliases for compatibility (populated from .env or defaults)
    EMAILS_FROM_EMAIL: str = "onboarding@resend.dev"
    EMAILS_FROM_NAME: str = "Evalyn"

    OPERATIONS_MANAGER_EMAIL: str = "manager@evalyn.ai"
    HR_EMAIL: str = "hr@evalyn.ai"
    EMAIL_TEST_OVERRIDE: str = ""

    # Team lead emails
    LEAD_AI_EMAIL: str = ""
    LEAD_WEB_EMAIL: str = ""
    LEAD_SEO_EMAIL: str = ""
    LEAD_SHOPIFY_EMAIL: str = ""
    LEAD_UIUX_EMAIL: str = ""
    
    @model_validator(mode='after')
    def add_frontend_url_to_cors(self) -> 'Settings':
        if self.FRONTEND_URL and self.FRONTEND_URL not in self.ALLOWED_ORIGINS:
            self.ALLOWED_ORIGINS = self.ALLOWED_ORIGINS + [self.FRONTEND_URL]
        return self

    # ✅ Pydantic v2 config
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"   # allows extra env variables
    )


settings = Settings()
