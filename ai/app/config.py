import os


class Config:
    def __init__(self) -> None:
        self.database_url: str = os.getenv("DATABASE_URL")
        self.redis_url: str = os.getenv("REDIS_URL")
        self.embedding_model: str = os.getenv(
            "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
        )
        self.llm_base_url: str = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
        self.llm_api_key: str = os.getenv("LLM_API_KEY", "")
        self.llm_model: str = os.getenv("LLM_MODEL", "gpt-4o-mini")

        if not self.database_url or self.database_url == "":
            msg = "DATABASE_URL is required in environment variables"
            raise ValueError(msg)

        if not self.redis_url or self.redis_url == "":
            msg = "REDIS_URL is required in environment variables"
            raise ValueError(msg)
