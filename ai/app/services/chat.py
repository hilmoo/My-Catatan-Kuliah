from collections.abc import AsyncIterator
from dataclasses import dataclass

from ai.app.utils.retriever import Retriever
from openai import AsyncOpenAI

from app.store.db import DbRepository
from app.store.redis import RedisRepository
from app.utils.stream import format_sse, stream_data

SYSTEM_PROMPT_TEMPLATE = """\
Kamu adalah asisten belajar untuk catatan kuliah.
Jawab pertanyaan berdasarkan konteks berikut. \
Jika tidak ada informasi yang relevan dalam konteks, katakan bahwa kamu tidak memiliki informasi tersebut.

Konteks:
{context}
"""


def build_system_prompt(chunks: list[dict[str, object]]) -> str:
    context = "\n\n---\n\n".join(str(chunk["content"]) for chunk in chunks)
    return SYSTEM_PROMPT_TEMPLATE.format(context=context)


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

    async def stream_chat(self, request: ChatServiceRequest) -> AsyncIterator[str]:
        embedding = self.retriever.embed_query(request.message)
        chunks = await self.db_repo.hybrid_search(
            request.message,
            embedding,
            request.workspace_id,
        )

        stream_id = await self.db_repo.create_stream(
            request.id,
            request.user_id,
            request.workspace_id,
        )

        if not chunks:
            events = [
                format_sse({"type": "start", "messageId": "empty"}),
                format_sse({"type": "text-start", "id": "text-1"}),
                format_sse(
                    {
                        "type": "text-delta",
                        "id": "text-1",
                        "delta": "Maaf, catatan tidak relevan.",
                    }
                ),
                format_sse({"type": "text-end", "id": "text-1"}),
                format_sse({"type": "finish"}),
                "data: [DONE]\n\n",
            ]
            for event in events:
                await self.redis_repo.append_chunk(stream_id, event)
                yield event
            await self.db_repo.clear_active_stream(request.id)
            return

        system_prompt = build_system_prompt(chunks)

        async for event in stream_data(
            client=self.llm_client,
            model=self.llm_model,
            system_prompt=system_prompt,
            user_message=request.message,
        ):
            await self.redis_repo.append_chunk(stream_id, event)
            yield event

        await self.db_repo.clear_active_stream(request.id)
