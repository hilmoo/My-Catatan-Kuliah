from fastapi import Request
from openai import AsyncOpenAI

from app.config import Config
from app.store.db import DbRepository
from app.store.redis import RedisRepository
from app.utils.retriever import Retriever


class AppState:
    def __init__(
        self,
        config: Config,
        db_repo: DbRepository,
        redis_repo: RedisRepository,
        retriever: Retriever,
        llm_client: AsyncOpenAI,
    ) -> None:
        self.config = config
        self.db_repo = db_repo
        self.redis_repo = redis_repo
        self.retriever = retriever
        self.llm_client = llm_client


def get_container(request: Request) -> AppState:
    return request.app.state.container
