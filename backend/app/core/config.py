from functools import lru_cache
from os import getenv

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SHRAMIK API"
    environment: str = "development"
    api_prefix: str = "/api"
    database_url: str | None = None
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_publishable_key: str | None = None
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @staticmethod
    def parse_cors_origins(value: str) -> list[str]:
        return [origin.strip() for origin in value.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    raw_origins = getenv("CORS_ALLOWED_ORIGINS")
    if raw_origins:
        settings.cors_allowed_origins = settings.parse_cors_origins(raw_origins)
    return settings
