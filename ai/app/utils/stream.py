"""AI SDK Data Stream Protocol — SSE formatter.

Adapted from https://github.com/vercel-labs/ai-sdk-preview-python-streaming
Simplified: text streaming only (no tool calls).
"""

import json
import uuid
from collections.abc import AsyncIterator

from openai import AsyncOpenAI
from openai.types import CompletionUsage


def format_sse(payload: dict[str, object]) -> str:
    """Format a payload as an SSE data line."""
    return f"data: {json.dumps(payload, separators=(',', ':'))}\n\n"


def _build_finish_metadata(
    finish_reason: str | None,
    usage_data: CompletionUsage | None,
) -> dict[str, object]:
    """Build the finish event metadata from completion state."""
    metadata: dict[str, object] = {}

    if finish_reason is not None:
        metadata["finishReason"] = finish_reason.replace("_", "-")

    if usage_data is not None:
        usage_payload: dict[str, int] = {
            "promptTokens": usage_data.prompt_tokens,
            "completionTokens": usage_data.completion_tokens,
        }
        total_tokens = getattr(usage_data, "total_tokens", None)
        if total_tokens is not None:
            usage_payload["totalTokens"] = total_tokens
        metadata["usage"] = usage_payload

    return metadata


async def stream_data(
    client: AsyncOpenAI,
    model: str,
    system_prompt: str,
    history_messages: list[dict[str, str]],
    user_message: str,
) -> AsyncIterator[str]:
    """Yield SSE events for a streaming chat completion (Data Stream Protocol).

    Event sequence: start → text-start → text-delta* → text-end → finish → [DONE]
    """
    message_id = f"msg-{uuid.uuid4().hex}"
    text_stream_id = "text-1"

    # 1. Start message
    yield format_sse({"type": "start", "messageId": message_id})

    # 2. Start text part
    yield format_sse({"type": "text-start", "id": text_stream_id})

    # 3. Stream tokens
    stream = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            *history_messages,
            {"role": "user", "content": user_message},
        ],
        stream=True,
    )

    finish_reason = None
    usage_data = None

    async for chunk in stream:
        for choice in chunk.choices:
            if choice.finish_reason is not None:
                finish_reason = choice.finish_reason

            delta = choice.delta
            if delta is None:
                continue

            if delta.content is not None:
                yield format_sse(
                    {"type": "text-delta", "id": text_stream_id, "delta": delta.content}
                )

        if not chunk.choices and chunk.usage is not None:
            usage_data = chunk.usage

    # 4. End text part
    yield format_sse({"type": "text-end", "id": text_stream_id})

    # 5. Finish message
    finish_metadata = _build_finish_metadata(finish_reason, usage_data)
    if finish_metadata:
        yield format_sse({"type": "finish", "messageMetadata": finish_metadata})
    else:
        yield format_sse({"type": "finish"})

    # 6. Done
    yield "data: [DONE]\n\n"
