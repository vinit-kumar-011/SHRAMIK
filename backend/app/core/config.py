from functools import lru_cache
from typing import Annotated, Any

from pydantic import BeforeValidator, Field
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _split_comma_separated(value: Any) -> Any:
    """Accept a comma-separated environment value or an already-parsed list."""
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return value


CorsOrigins = Annotated[list[str], NoDecode, BeforeValidator(_split_comma_separated)]


class Settings(BaseSettings):
    app_name: str = "SHRAMIK API"
    environment: str = "development"
    showcase_mode: bool = Field(default=False, validation_alias="SHRAMIK_SHOWCASE_MODE")
    api_prefix: str = "/api"
    database_url: str | None = None
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_publishable_key: str | None = None
    cors_allowed_origins: CorsOrigins = Field(
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
        populate_by_name=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
