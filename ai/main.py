import logging
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from llm import build_system_prompt, stream_chat
from retriever import hybrid_search

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
    """RAG chat: retrieve context → stream LLM response (Text Stream Protocol)."""

    async def text_stream() -> AsyncIterator[str]:
        # 1. Retrieve relevant chunks
        chunks = await hybrid_search(request.message, request.workspace_id)
        logger.info(
            "Retrieved %s chunks for workspace_id=%s",
            len(chunks),
            request.workspace_id,
        )

        if not chunks:
            yield "Maaf, saya tidak menemukan catatan yang relevan untuk pertanyaan ini."
            return

        # 2. Build prompt with context
        system_prompt = build_system_prompt(chunks)

        # 3. Stream LLM response as plain text
        async for token in stream_chat(system_prompt, request.message):
            yield token

    return StreamingResponse(
        text_stream(),
        media_type="text/plain; charset=utf-8",
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai"}
