from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./deeporder.db"
    cors_origins: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:5174,"
        "http://127.0.0.1:5174"
    )
    jwt_secret_key: str = "deeporder-dev-secret"
    access_token_expire_minutes: int = 120
    refresh_token_expire_days: int = 14
    session_refresh_token_expire_hours: int = 12
    admin_token: str = "deeporder-admin-token"
    ai_provider: str = "gemini"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash-lite"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    openai_api_key: str | None = None
    openai_model: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    juso_confirm_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("JUSO_CONFIRM_KEY", "DEEPORDER_JUSO_CONFIRM_KEY"),
    )
    juso_return_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("JUSO_RETURN_URL", "DEEPORDER_JUSO_RETURN_URL"),
    )

    model_config = SettingsConfigDict(env_prefix="DEEPORDER_", env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
