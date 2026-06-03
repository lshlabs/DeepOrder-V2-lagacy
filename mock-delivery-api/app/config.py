from functools import lru_cache

from pydantic import AnyHttpUrl
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./mock_delivery.db"
    deeporder_webhook_url: AnyHttpUrl = Field(
        default="http://localhost:8000/api/external/orders/webhook",
        validation_alias="DEEPORDER_WEBHOOK_URL",
    )

    model_config = SettingsConfigDict(env_prefix="MOCK_", env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
