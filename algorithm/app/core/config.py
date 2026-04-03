from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "Lotto Algorithm Server"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql+asyncpg://lotto_user:lotto_pass_2024@localhost:3003/lotto"
    REDIS_URL: str = "redis://localhost:3004/1"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
