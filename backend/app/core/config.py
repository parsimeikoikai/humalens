from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Humalens"

    CORS_ORIGINS: list[str] = ["http://localhost:3050"]

    CHROMA_HOST: str = "chromadb"
    CHROMA_PORT: int = 8001

    OPENAI_API_KEY: str = ""

    JWT_SECRET_KEY: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7

    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"

    # In case you want to point to an on-disk Chroma directory when not using Docker
    CHROMA_PERSIST_DIR: str = "/chroma/chroma"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
