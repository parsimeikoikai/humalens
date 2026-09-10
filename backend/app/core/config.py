import json
import logging

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

DEFAULT_JWT_SECRET = "dev-secret-change-me"


def _parse_list(value: str) -> list[str]:
    """Read a list setting written as CSV or as a JSON array.

    These are kept as plain strings on the model because pydantic-settings
    JSON-decodes `list[str]` fields straight from the environment, before
    any validator runs — so a readable `a, b` value in a .env file would
    blow up at import time.
    """
    value = (value or "").strip()

    if not value:
        return []

    if value.startswith("["):
        try:
            return [str(item).strip() for item in json.loads(value)]
        except (json.JSONDecodeError, TypeError):
            logger.warning("Could not parse %r as JSON; reading it as CSV", value)

    return [item.strip() for item in value.split(",") if item.strip()]


class Settings(BaseSettings):
    PROJECT_NAME: str = "Humalens"

    # "development" relaxes the startup checks below. Anything else is
    # treated as a real deployment and must be configured properly.
    ENVIRONMENT: str = "development"

    # Comma-separated, or a JSON array.
    CORS_ORIGINS: str = "http://localhost:3050,http://localhost:3000"

    # Accounts allowed to read /admin/*. Comma-separated emails.
    ADMIN_EMAILS: str = ""

    CHROMA_HOST: str = ""
    CHROMA_PORT: int = 8000
    CHROMA_PATH: str = "./chroma_db"

    OPENAI_API_KEY: str = ""

    JWT_SECRET_KEY: str = DEFAULT_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7

    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return _parse_list(self.CORS_ORIGINS)

    @property
    def admin_emails(self) -> set[str]:
        return {email.lower() for email in _parse_list(self.ADMIN_EMAILS)}

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() not in {"development", "dev", "local", "test"}

    @model_validator(mode="after")
    def _reject_insecure_production_config(self) -> "Settings":
        # A deployment running on the shipped default secret can have any
        # user's token forged by anyone who has read the source, so refuse
        # to start rather than come up quietly compromised.
        if self.JWT_SECRET_KEY == DEFAULT_JWT_SECRET:
            if self.is_production:
                raise RuntimeError(
                    "JWT_SECRET_KEY is still the built-in development "
                    "default. Set it to a random secret before running with "
                    f"ENVIRONMENT={self.ENVIRONMENT}."
                )

            logger.warning(
                "Using the built-in development JWT secret. Set "
                "JWT_SECRET_KEY before deploying."
            )

        return self


settings = Settings()
