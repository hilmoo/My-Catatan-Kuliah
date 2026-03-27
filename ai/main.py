import logging
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel

from config import settings
from llm import build_system_prompt
from retriever import hybrid_search
from utils.stream import format_sse, stream_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Inference Service — belut ternate",
    version="0.1.0",
)


class ChatRequest(BaseModel):
    message: str
    workspace_id: int


@app.post("/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    """RAG chat: retrieve context → stream LLM response (Data Stream Protocol)."""

    async def event_stream() -> AsyncIterator[str]:
        # 1. Retrieve relevant chunks
        chunks = await hybrid_search(request.message, request.workspace_id)
        logger.info(
            "Retrieved %s chunks for workspace_id=%s",
            len(chunks),
            request.workspace_id,
        )

        if not chunks:
            # Still follow Data Stream Protocol for empty results
            yield format_sse({"type": "start", "messageId": "empty"})
            yield format_sse({"type": "text-start", "id": "text-1"})
            yield format_sse({
                "type": "text-delta",
                "id": "text-1",
                "delta": "Maaf, saya tidak menemukan catatan yang relevan untuk pertanyaan ini.",
            })
            yield format_sse({"type": "text-end", "id": "text-1"})
            yield format_sse({"type": "finish"})
            yield "data: [DONE]\n\n"
            return

        # 2. Build prompt with context
        system_prompt = build_system_prompt(chunks)

        # 3. Stream LLM response as Data Stream Protocol events
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
            yield event

    response = StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
    )
    # Required headers for AI SDK
    response.headers["x-vercel-ai-ui-message-stream"] = "v1"
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Connection"] = "keep-alive"
    response.headers["X-Accel-Buffering"] = "no"
    return response


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai"}
