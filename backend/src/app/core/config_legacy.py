from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, model_validator
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings"""

    # Application
    APP_NAME: str = "Centra"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    @field_validator("DEBUG", mode="before")
    @classmethod
    def _coerce_debug(cls, v):
        if isinstance(v, bool):
            return v
        if v is None:
            return False
        s = str(v).strip().lower()
        if s in {"1", "true", "yes", "on"}:
            return True
        if s in {"0", "false", "no", "off"}:
            return False
        return False
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"
    UPLOAD_DIR: str = "uploads"

    # Attendance
    ATTENDANCE_BACKDATE_LIMIT_DAYS: int = 3
    # Phase 6 (reminders): hour of day, UTC, the daily "you haven't checked
    # in yet" reminder job runs at. A single daily digest, not per-shift
    # timing — v1 default, easy to change without a migration.
    ATTENDANCE_REMINDER_HOUR_UTC: int = 11
    ATTENDANCE_REMINDERS_ENABLED: bool = True
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    PUBLIC_URL: str = os.getenv("PUBLIC_URL", os.getenv("FRONTEND_URL", "http://localhost:3000"))

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

    # Google Drive Storage
    GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO: str = os.getenv("GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO", "")
    GOOGLE_DRIVE_FOLDER_ID: str = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "")
    GOOGLE_DRIVE_PUBLIC_SHARE: bool = os.getenv("GOOGLE_DRIVE_PUBLIC_SHARE", "true").lower() == "true"
    # Google Drive OAuth 2.0 (preferred over service account — avoids storageQuotaExceeded)
    GOOGLE_DRIVE_OAUTH_CLIENT_ID: str = os.getenv("GOOGLE_DRIVE_OAUTH_CLIENT_ID", "")
    GOOGLE_DRIVE_OAUTH_CLIENT_SECRET: str = os.getenv("GOOGLE_DRIVE_OAUTH_CLIENT_SECRET", "")
    GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN: str = os.getenv("GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN", "")

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
    RESEND_FROM_NAME: str = "Centra"
    
    # Aliases for compatibility (populated from .env or defaults)
    EMAILS_FROM_EMAIL: str = "onboarding@resend.dev"
    EMAILS_FROM_NAME: str = "Centra"

    OPERATIONS_MANAGER_EMAIL: str = "manager@centra.ai"
    HR_EMAIL: str = "hr@centra.ai"
    EMAIL_TEST_OVERRIDE: str = ""

    # Team lead emails are now managed via Department.lead_user_id in the database.
    # No env vars needed — assign a lead to a department and their email is used automatically.
    
    @model_validator(mode='after')
    def add_frontend_url_to_cors(self) -> 'Settings':
        if self.FRONTEND_URL and self.FRONTEND_URL not in self.ALLOWED_ORIGINS:
            self.ALLOWED_ORIGINS = self.ALLOWED_ORIGINS + [self.FRONTEND_URL]
        return self

    @model_validator(mode='after')
    def resolve_google_drive_credentials(self) -> 'Settings':
        info = self.GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO.strip()
        # If it looks like a truncated parse (e.g. just '{'), attempt custom .env file parsing fallback.
        if info and (not info.startswith("{") or not info.endswith("}")):
            env_path = ".env"
            if not os.path.exists(env_path):
                possible_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))
                if os.path.exists(possible_path):
                    env_path = possible_path
            
            if os.path.exists(env_path):
                try:
                    with open(env_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    marker = "GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO="
                    idx = content.find(marker)
                    if idx != -1:
                        json_start = idx + len(marker)
                        first_curly = content.find("{", json_start)
                        if first_curly != -1:
                            brace_count = 0
                            in_quotes = False
                            escaped = False
                            json_str = ""
                            for char in content[first_curly:]:
                                json_str += char
                                if char == '"' and not escaped:
                                    in_quotes = not in_quotes
                                elif char == '\\' and in_quotes:
                                    escaped = not escaped
                                    continue
                                elif char == '{' and not in_quotes:
                                    brace_count += 1
                                elif char == '}' and not in_quotes:
                                    brace_count -= 1
                                    if brace_count == 0:
                                        break
                                escaped = False
                            if brace_count == 0:
                                import json
                                json.loads(json_str)  # validate JSON format
                                self.GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO = json_str
                except Exception:
                    pass
        return self

    # ✅ Pydantic v2 config
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"   # allows extra env variables
    )


settings = Settings()
