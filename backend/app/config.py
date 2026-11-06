from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "backend" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _is_placeholder(value: str | None) -> bool:
    if not value:
        return True
    lowered = value.lower()
    return len(value) < 20 or any(token in lowered for token in ("your_", "placeholder", "changeme", "xxx"))


class Settings(BaseSettings):
    app_name: str = "RecallOps AI"
    environment: str = "development"
    log_level: str = "INFO"

    database_url: str = f"sqlite:///{DATA_DIR / 'recallops.db'}"

    groq_api_key: str | None = None
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "openai/gpt-oss-120b"

    hindsight_api_url: str = "http://localhost:8888"
    hindsight_api_key: str | None = None
    hindsight_bank_id: str = "recallops-incidents"
    hindsight_timeout: float = 120.0

    band_api_key: str | None = None
    band_api_url: str | None = None
    band_tom_api_key: str | None = None
    band_jerry_api_key: str | None = None
    band_tom_agent_id: str | None = None
    band_jerry_agent_id: str | None = None
    band_chat_id: str | None = None
    band_tom_name: str = "Tom"
    band_jerry_name: str = "Jerry"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def groq_effective_key(self) -> str | None:
        return None if _is_placeholder(self.groq_api_key) else self.groq_api_key

    @property
    def groq_configured(self) -> bool:
        return bool(self.groq_effective_key)

    @property
    def groq_key_source(self) -> str:
        return "env" if self.groq_configured else "missing"

    @property
    def hindsight_configured(self) -> bool:
        return bool(self.hindsight_api_url and self.hindsight_api_url.strip())

    @property
    def band_configured(self) -> bool:
        tom_key = self.band_tom_api_key or self.band_api_key
        jerry_key = self.band_jerry_api_key or self.band_api_key
        return bool(tom_key and jerry_key and self.band_tom_agent_id and self.band_jerry_agent_id)

    @property
    def band_tom_key(self) -> str | None:
        return self.band_tom_api_key or self.band_api_key

    @property
    def band_jerry_key(self) -> str | None:
        return self.band_jerry_api_key or self.band_api_key


@lru_cache
def get_settings() -> Settings:
    return Settings()
