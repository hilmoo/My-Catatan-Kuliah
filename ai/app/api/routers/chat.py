import logging
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse

from app.api.dependencies import AppState, get_container
from app.api.schema import ChatRequest
from app.api.services.chat import ChatService, ChatServiceRequest, get_chat_service
from app.utils.base58 import base58_to_uuid
from app.utils.stream import format_sse
from app.utils.uuid import is_valid_uuidv7

router = APIRouter(prefix="/chat", tags=["chat"])

logger = logging.getLogger(__name__)


@router.post("/{workspace_id}")
async def chat(
    workspace_id: str,
    request: ChatRequest,
    chat_service: Annotated[ChatService, Depends(get_chat_service)],
    container: Annotated[AppState, Depends(get_container)],
) -> StreamingResponse:
    # Decode Base58 public IDs → UUIDs → resolve to integer IDs
    user_iid = base58_to_uuid(request.user_id)
    workspace_iid = base58_to_uuid(workspace_id)

    user_id = await container.db_repo.resolve_user_id(user_iid)
    workspace_id = await container.db_repo.resolve_workspace_id(workspace_iid)
    course_id = None
    note_id = None

    if request.course_id:
        course_iid = base58_to_uuid(request.course_id)
        course_id = await container.db_repo.resolve_course_id(
            course_iid, workspace_id=workspace_id
        )

    if request.notes_id:
        note_iid = base58_to_uuid(request.notes_id)
        note_id, note_course_id = await container.db_repo.resolve_note_id(
            note_iid, workspace_id=workspace_id
        )
        if course_id is not None and course_id != note_course_id:
            msg = "notes_id does not belong to course_id"
            raise ValueError(msg)
        if course_id is None:
            course_id = note_course_id

    service_request = ChatServiceRequest(
        chat_iid=request.id,
        user_id=user_id,
        message=request.message,
        workspace_id=workspace_id,
        course_id=course_id,
        note_id=note_id,
        answer_style=request.answer_style,
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
    if not is_valid_uuidv7(chat_id):
        return Response(status_code=400, content="Invalid chat id")

    stream_id = await container.db_repo.get_active_stream(chat_id)
    if not stream_id:
        return Response(status_code=204)

    async def replay() -> AsyncIterator[str]:
        try:
            last_id = "-"
            chunk_size = 50

            while True:
                chunk = await container.redis_repo.replay_stream_paginated(
                    stream_id, start=last_id, count=chunk_size
                )

                if not chunk:
                    break

                for event_id, event_data in chunk:
                    yield event_data
                    last_id = f"({event_id}"

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
