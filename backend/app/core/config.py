from functools import lru_cache
from os import getenv

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SHRAMIK API"
    environment: str = "development"
    api_prefix: str = "/api"
    database_url: str | None = None
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )

    # Server-side only. Never prefix these with NEXT_PUBLIC_ or return them from an API.
    ingestion_admin_token: str | None = None
    ogd_api_key: str | None = None
    ogd_timeout_seconds: float = Field(default=20.0, ge=1.0, le=60.0)
    ogd_eshram_resource_id: str | None = None
    ogd_udyam_resource_id: str | None = None
    ogd_udyam_services_resource_id: str | None = None
    ogd_udyam_manufacturing_resource_id: str | None = None
    ogd_mgnrega_resource_id: str | None = None
    ogd_jss_resource_id: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
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
