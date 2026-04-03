from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "Lotto API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql+asyncpg://lotto_user:lotto_pass_2024@localhost:3003/lotto"
    REDIS_URL: str = "redis://localhost:3004/0"
    ALGORITHM_URL: str = "http://localhost:3006"

    DHLOTTERY_API_URL: str = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo="

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
