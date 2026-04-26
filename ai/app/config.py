from pydantic_settings import BaseSettings


class Config(BaseSettings):
    database_url: str
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # LLM
    llm_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    # Redis
    redis_url: str = "redis://localhost:6379"

    model_config = {"env_file": ".env"}
