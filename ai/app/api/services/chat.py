import asyncio
import json
import logging
import uuid
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

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = """\
Kamu adalah asisten belajar untuk catatan kuliah.
Jawab pertanyaan berdasarkan konteks berikut. \
Jika tidak ada informasi yang relevan dalam konteks, katakan bahwa kamu tidak memiliki informasi tersebut.

Konteks:
{context}
"""


@dataclass(slots=True)
class ChatServiceRequest:
    chat_iid: uuid.UUID
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
        self._background_tasks: set[asyncio.Task[None]] = set()

    def _build_system_prompt(self, chunks: list[dict[str, object]]) -> str:
        context = "\n\n---\n\n".join(str(chunk["content"]) for chunk in chunks)
        return SYSTEM_PROMPT_TEMPLATE.format(context=context)

    async def _generate_and_buffer_llm_response(
        self,
        chat_iid: uuid.UUID,
        chat_id: int,
        stream_id: str,
        system_prompt: str,
        history_messages: list,
        user_message: str,
    ) -> None:
        """Runs independently of the client connection to guarantee completion."""
        assistant_parts: list[str] = []

        try:
            async for event in stream_data(
                client=self.llm_client,
                model=self.llm_model,
                system_prompt=system_prompt,
                history_messages=history_messages,
                user_message=user_message,
            ):
                if event.startswith("data: {"):
                    payload = json.loads(event[6:])
                    if payload.get("type") == "text-delta":
                        delta = payload.get("delta")
                        if isinstance(delta, str) and delta:
                            assistant_parts.append(delta)

                # Keep writing to Redis even if the client is gone
                await self.redis_repo.append_chunk(stream_id, event)

            # Save the complete message to Postgres once finished
            assistant_text = "".join(assistant_parts).strip()
            if assistant_text:
                await self.db_repo.save_message(
                    chat_id,
                    role="assistant",
                    text=assistant_text,
                )
        except Exception as e:
            logger.exception(
                "Error during LLM response generation",
                exc_info=e,
                extra={"chat_iid": str(chat_iid), "stream_id": stream_id},
            )
        finally:
            await self.db_repo.clear_active_stream(chat_iid)
            await self.redis_repo.expire_stream(stream_id)

    async def stream_chat(self, request: ChatServiceRequest) -> AsyncIterator[str]:
        embedding = await self.retriever.embed_query(request.message)
        chunks = await self.db_repo.hybrid_search(
            request.message,
            embedding,
            request.workspace_id,
        )

        chat_id, stream_id = await self.db_repo.create_stream(
            request.chat_iid,
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
            await self.db_repo.clear_active_stream(request.chat_iid)
            await self.redis_repo.expire_stream(stream_id)
            return

        system_prompt = self._build_system_prompt(chunks)

        task = asyncio.create_task(
            self._generate_and_buffer_llm_response(
                chat_iid=request.chat_iid,
                chat_id=chat_id,
                stream_id=stream_id,
                system_prompt=system_prompt,
                history_messages=history_messages,
                user_message=request.message,
            )
        )
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)

        last_id = "-"
        while True:
            events = await self.redis_repo.read_stream_blocking(
                stream_id, last_id, block_ms=2000
            )

            if not events:
                is_active = await self.db_repo.is_stream_active(request.chat_iid)
                if not is_active:
                    break
                continue

            for event_id, event_data in events:
                yield event_data
                last_id = event_id

                if "data: [DONE]" in event_data:
                    return


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
