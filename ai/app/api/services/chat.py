import json
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends
from openai import AsyncOpenAI

from app.api.dependencies import AppState, get_container
from app.store.db import DbRepository
from app.store.redis import RedisRepository
from app.utils.retriever import Retriever
from app.utils.stream import format_sse, stream_data

SYSTEM_PROMPT_TEMPLATE = """\
Kamu adalah asisten belajar untuk catatan kuliah.
Jawab pertanyaan berdasarkan konteks berikut. \
Jika tidak ada informasi yang relevan dalam konteks, katakan bahwa kamu tidak memiliki informasi tersebut.

Konteks:
{context}
"""


@dataclass(slots=True)
class ChatServiceRequest:
    id: str
    user_id: int
    message: str
    workspace_id: int


class ChatService:
    """Business logic for chat streaming."""

    def __init__(
        self,
        db_repo: DbRepository,
        redis_repo: RedisRepository,
        retriever: Retriever,
        llm_client: AsyncOpenAI,
        llm_model: str,
    ) -> None:
        self.db_repo = db_repo
        self.redis_repo = redis_repo
        self.retriever = retriever
        self.llm_client = llm_client
        self.llm_model = llm_model

    def _build_system_prompt(self, chunks: list[dict[str, object]]) -> str:
        context = "\n\n---\n\n".join(str(chunk["content"]) for chunk in chunks)
        return SYSTEM_PROMPT_TEMPLATE.format(context=context)

    async def stream_chat(self, request: ChatServiceRequest) -> AsyncIterator[str]:
        embedding = self.retriever.embed_query(request.message)
        chunks = await self.db_repo.hybrid_search(
            request.message,
            embedding,
            request.workspace_id,
        )

        chat_id, stream_id = await self.db_repo.create_stream(
            request.id,
            request.user_id,
            request.workspace_id,
        )
        history_messages = await self.db_repo.get_chat_history(chat_id)
        await self.db_repo.save_message(chat_id, role="user", text=request.message)

        if not chunks:
            assistant_text = "Maaf, catatan tidak relevan."
            events = [
                format_sse({"type": "start", "messageId": "empty"}),
                format_sse({"type": "text-start", "id": "text-1"}),
                format_sse(
                    {
                        "type": "text-delta",
                        "id": "text-1",
                        "delta": assistant_text,
                    }
                ),
                format_sse({"type": "text-end", "id": "text-1"}),
                format_sse({"type": "finish"}),
                "data: [DONE]\n\n",
            ]
            for event in events:
                await self.redis_repo.append_chunk(stream_id, event)
                yield event
            await self.db_repo.save_message(
                chat_id, role="assistant", text=assistant_text
            )
            await self.db_repo.clear_active_stream(request.id)
            await self.redis_repo.expire_stream(stream_id)
            return

        system_prompt = self._build_system_prompt(chunks)
        assistant_parts: list[str] = []

        try:
            async for event in stream_data(
                client=self.llm_client,
                model=self.llm_model,
                system_prompt=system_prompt,
                history_messages=history_messages,
                user_message=request.message,
            ):
                if event.startswith("data: {"):
                    payload = json.loads(event[6:])
                    if payload.get("type") == "text-delta":
                        delta = payload.get("delta")
                        if isinstance(delta, str) and delta:
                            assistant_parts.append(delta)

                await self.redis_repo.append_chunk(stream_id, event)
                yield event

            assistant_text = "".join(assistant_parts).strip()
            if assistant_text:
                await self.db_repo.save_message(
                    chat_id,
                    role="assistant",
                    text=assistant_text,
                )
        finally:
            await self.db_repo.clear_active_stream(request.id)
            await self.redis_repo.expire_stream(stream_id)


def get_chat_service(
    container: Annotated[AppState, Depends(get_container)],
) -> ChatService:
    return ChatService(
        db_repo=container.db_repo,
        redis_repo=container.redis_repo,
        retriever=container.retriever,
        llm_client=container.llm_client,
        llm_model=container.config.llm_model,
    )
