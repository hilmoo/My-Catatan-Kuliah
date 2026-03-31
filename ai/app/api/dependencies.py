from typing import Annotated

from ai.app.utils.retriever import Retriever
from fastapi import Depends, Request
from openai import AsyncOpenAI

from app.config import Config
from app.services.chat import ChatService
from app.store.db import DbRepository
from app.store.redis import RedisRepository


def get_db_repo(request: Request) -> DbRepository:
    return request.app.state.db_repo


def get_app_config(request: Request) -> Config:
    return request.app.state.config


def get_redis_repo(request: Request) -> RedisRepository:
    return request.app.state.redis_repo


def get_retriever(request: Request) -> Retriever:
    return request.app.state.retriever


def get_llm_client(request: Request) -> AsyncOpenAI:
    return request.app.state.llm_client


def get_chat_service(
    app_config: Annotated[Config, Depends(get_app_config)],
    db_repo: Annotated[DbRepository, Depends(get_db_repo)],
    redis_repo: Annotated[RedisRepository, Depends(get_redis_repo)],
    retriever: Annotated[Retriever, Depends(get_retriever)],
    llm_client: Annotated[AsyncOpenAI, Depends(get_llm_client)],
) -> ChatService:
    return ChatService(
        db_repo=db_repo,
        redis_repo=redis_repo,
        retriever=retriever,
        llm_client=llm_client,
        llm_model=app_config.llm_model,
    )
