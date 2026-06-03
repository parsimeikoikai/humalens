from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ReliefLens"

    CHROMA_HOST: str = "chromadb"
    CHROMA_PORT: int = 8001

    ANTHROPIC_API_KEY: str = ""

    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"

    # In case you want to point to an on-disk Chroma directory when not using Docker
    CHROMA_PERSIST_DIR: str = "/chroma/chroma"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

