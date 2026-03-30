from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite:///./date_meal.db"
    secret_key: str = "change-me-in-production"
    # Comma-separated list stored as string; parsed into list at runtime
    allowed_origins_str: str = "http://localhost:8081,exp://localhost:8081"
    kakao_api_key: str = ""
    seoul_api_key: str = ""
    naver_client_id: str = ""
    naver_client_secret: str = ""
    anthropic_api_key: str = ""

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins_str.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
