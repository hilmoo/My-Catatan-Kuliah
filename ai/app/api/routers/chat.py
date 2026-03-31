import logging
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse

from app.api.dependencies import AppState, get_container
from app.api.schema import ChatRequest
from app.api.services.chat import ChatService, ChatServiceRequest, get_chat_service
from app.utils.stream import format_sse

router = APIRouter(prefix="/chat", tags=["chat"])

logger = logging.getLogger(__name__)


@router.post("")
async def chat(
    request: ChatRequest,
    chat_service: Annotated[ChatService, Depends(get_chat_service)],
) -> StreamingResponse:
    service_request = ChatServiceRequest(
        id=request.id,
        user_id=request.user_id,
        message=request.message,
        workspace_id=request.workspace_id,
    )

    async def event_stream() -> AsyncIterator[str]:
        try:
            async for event in chat_service.stream_chat(service_request):
                yield event
        except Exception as e:
            logger.exception(
                "Error during chat streaming",
                exc_info=e,
                extra={"request": service_request},
            )
            yield format_sse(
                {
                    "type": "error",
                    "message": "Terjadi kesalahan saat memproses percakapan.",
                }
            )

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/{chat_id}/stream", response_model=None)
async def resume_stream(
    chat_id: str,
    container: Annotated[AppState, Depends(get_container)],
) -> StreamingResponse | Response:
    stream_id = await container.db_repo.get_active_stream(chat_id)
    if not stream_id:
        return Response(status_code=204)

    async def replay() -> AsyncIterator[str]:
        try:
            async for event in container.redis_repo.replay_stream(stream_id):
                yield event
        except Exception as e:
            logger.exception(
                "Error during stream replay",
                exc_info=e,
                extra={"chat_id": chat_id, "stream_id": stream_id},
            )
            yield format_sse(
                {
                    "type": "error",
                    "message": "Terjadi kesalahan saat memuat ulang percakapan.",
                }
            )

    return StreamingResponse(replay(), media_type="text/event-stream")
