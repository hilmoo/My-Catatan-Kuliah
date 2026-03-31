import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg
import redis.asyncio as aioredis
from ai.app.utils.retriever import Retriever
from fastapi import FastAPI
from openai import AsyncOpenAI
from pgvector.asyncpg import register_vector

from app.config import Config
from app.store.db import DbRepository
from app.store.redis import RedisRepository

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info("Initializing dependencies...")
    app_config = Config()

    async def init_db(conn) -> None:  # noqa: ANN001
        await register_vector(conn)

    pool = await asyncpg.create_pool(app_config.database_url, init=init_db)
    redis_client = aioredis.from_url(app_config.redis_url, decode_responses=True)
    llm_client = AsyncOpenAI(
        base_url=app_config.llm_base_url,
        api_key=app_config.llm_api_key,
    )
    retriever = Retriever(app_config.embedding_model)

    app.state.config = app_config
    app.state.db_repo = DbRepository(pool)
    app.state.redis_repo = RedisRepository(redis_client)
    app.state.retriever = retriever
    app.state.llm_client = llm_client

    logger.info("Application startup complete.")
    yield

    logger.info("Tearing down dependencies...")
    await pool.close()
    await redis_client.aclose()
    await llm_client.close()
    logger.info("Application shutdown complete.")
