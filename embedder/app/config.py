import os

from dotenv import load_dotenv

load_dotenv(".env")


class Config:
    def __init__(self) -> None:
        self.database_url: str = os.getenv("DATABASE_URL")
        self.embedding_model: str = os.getenv(
            "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
        )
        self.chunk_size: int = int(os.getenv("CHUNK_SIZE", "500"))
        self.nats_url: str = os.getenv("NATS_URL", "nats://localhost:4222")

        if not self.database_url or self.database_url == "":
            msg = "DATABASE_URL is required in environment variables"
            raise ValueError(msg)

        if not self.nats_url or self.nats_url == "":
            msg = "NATS_URL is required in environment variables"
            raise ValueError(msg)
