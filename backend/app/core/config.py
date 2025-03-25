import os
import secrets
from typing import Any, Dict, List, Optional, Union
from pydantic import PostgresDsn, field_validator, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API settings
    API_V1_STR: str = "/api"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # CORS settings - origins that are allowed to make requests
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Database settings
    DATABASE_URL: PostgresDsn
    
    # Redis settings
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Flux AI settings
    FLUX_AI_API_KEY: str
    FLUX_AI_BASE_URL: str = "https://ai.runonflux.com"
    
    # Security
    DEFAULT_PASSWORD_LENGTH: int = 12
    
    # Initial admin user
    FIRST_ADMIN_EMAIL: Optional[str] = "admin@example.com"
    FIRST_ADMIN_PASSWORD: Optional[str] = "adminpassword"
    
    # File storage
    UPLOAD_FOLDER: str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 20
    
    # Frontend URL
    FRONTEND_URL: str = "http://localhost:3000"
    
    # EMail settings
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    
    # Model validators
    @model_validator(mode='after')
    def validate_first_admin(self) -> 'Settings':
        if self.FIRST_ADMIN_EMAIL and not self.FIRST_ADMIN_PASSWORD:
            raise ValueError("FIRST_ADMIN_PASSWORD must be set if FIRST_ADMIN_EMAIL is provided")
        return self
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()