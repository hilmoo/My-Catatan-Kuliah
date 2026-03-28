import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel

from config import settings
from llm import build_system_prompt
from retriever import hybrid_search
from stream_store import (
    append_chunk,
    close_redis,
    close_stream,
    create_stream,
    get_active_stream,
    init_redis,
    replay_stream,
)
from utils.stream import format_sse, stream_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Startup/shutdown: init and close Redis pool."""
    await init_redis()
    yield
    await close_redis()


app = FastAPI(
    title="AI Inference Service — belut ternate",
    version="0.1.0",
    lifespan=lifespan,
)


def _sse_headers(response: StreamingResponse) -> StreamingResponse:
    """Apply standard AI SDK streaming headers."""
    response.headers["x-vercel-ai-ui-message-stream"] = "v1"
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Connection"] = "keep-alive"
    response.headers["X-Accel-Buffering"] = "no"
    return response


class ChatRequest(BaseModel):
    id: str
    user_id: int
    message: str
    workspace_id: int


@app.post("/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    """RAG chat: retrieve context → stream LLM response (Data Stream Protocol).

    Each SSE chunk is also buffered to Redis for resume support.
    """

    async def event_stream() -> AsyncIterator[str]:
        # 1. Retrieve relevant chunks
        chunks = await hybrid_search(request.message, request.workspace_id)
        logger.info(
            "Retrieved %s chunks for workspace_id=%s",
            len(chunks),
            request.workspace_id,
        )

        # 2. Create a resumable stream entry
        stream_id = await create_stream(
            request.id, request.user_id, request.workspace_id
        )

        if not chunks:
            # Empty results — still follow Data Stream Protocol
            empty_events = [
                format_sse({"type": "start", "messageId": "empty"}),
                format_sse({"type": "text-start", "id": "text-1"}),
                format_sse({
                    "type": "text-delta",
                    "id": "text-1",
                    "delta": "Maaf, saya tidak menemukan catatan yang relevan untuk pertanyaan ini.",
                }),
                format_sse({"type": "text-end", "id": "text-1"}),
                format_sse({"type": "finish"}),
                "data: [DONE]\n\n",
            ]
            for event in empty_events:
                await append_chunk(stream_id, event)
                yield event
            await close_stream(request.id, stream_id)
            return

        # 3. Build prompt with context
        system_prompt = build_system_prompt(chunks)

        # 4. Stream LLM response — yield to client + buffer to Redis
        client = AsyncOpenAI(
            base_url=settings.llm_base_url,
            api_key=settings.llm_api_key,
        )
        async for event in stream_data(
            client=client,
            model=settings.llm_model,
            system_prompt=system_prompt,
            user_message=request.message,
        ):
            await append_chunk(stream_id, event)
            yield event

        # 5. Stream complete — cleanup
        await close_stream(request.id, stream_id)

    return _sse_headers(
        StreamingResponse(event_stream(), media_type="text/event-stream")
    )


@app.get("/chat/{chat_id}/stream", response_model=None)
async def resume_stream(chat_id: str) -> StreamingResponse | Response:
    """Resume an active stream — replay buffered chunks from Redis.

    Returns 204 if no active stream exists for this chat.
    """
    stream_id = await get_active_stream(chat_id)

    if stream_id is None:
        return Response(status_code=204)

    async def replay() -> AsyncIterator[str]:
        buffered = await replay_stream(stream_id)
        for chunk in buffered:
            yield chunk

    return _sse_headers(
        StreamingResponse(replay(), media_type="text/event-stream")
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai"}
