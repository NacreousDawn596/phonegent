"""
config.py — Central configuration for PhoneGent backend
"""
from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).parent

class Settings(BaseSettings):
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Ollama
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen3.5:0.8b"           # swap to any local model
    OLLAMA_VISION_MODEL: str = "qwen3.5:0.8b"     # used for image analysis
    OLLAMA_TIMEOUT: int = 120

    # Database
    DB_PATH: str = str(BASE_DIR / "phonegent.db")

    # Photos & audio
    MEDIA_DIR: str = str(BASE_DIR / "media")

    # Security  — set a random secret, checked by the frontend header
    API_SECRET: str = "change-me-in-env"

    class Config:
        env_file = BASE_DIR / ".env"
        extra = "ignore"

settings = Settings()
