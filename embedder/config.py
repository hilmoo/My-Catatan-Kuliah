from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    chunk_size: int = 500

    model_config = {"env_file": "../.env"}


settings = Settings()  # type: ignore[reportCallIssue]  # loaded from .env
