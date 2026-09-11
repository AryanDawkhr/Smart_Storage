import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Smart Solar Mini Cold Storage"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    SECRET_KEY: str = "sih-smart-storage-ner-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200

    # Auto fallback to sqlite if postgresql url not provided or unreachable
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./smart_storage.db")

    SIMULATION_MODE: bool = True
    SIMULATION_TICK_SECONDS: int = 4
    DEFAULT_STORAGE_UNIT: str = "NER-CS-001"

    ALLOWED_ORIGINS: List[str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
