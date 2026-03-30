import logging
from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = """\
Kamu adalah asisten belajar untuk catatan kuliah.
Jawab pertanyaan berdasarkan konteks berikut. \
Jika tidak ada informasi yang relevan dalam konteks, katakan bahwa kamu tidak memiliki informasi tersebut.

Konteks:
{context}
"""


def build_system_prompt(chunks: list[dict[str, object]]) -> str:
    """Build system prompt with retrieved chunks as context."""
    context = "\n\n---\n\n".join(str(c["content"]) for c in chunks)
    return SYSTEM_PROMPT_TEMPLATE.format(context=context)


async def stream_chat(system_prompt: str, user_message: str) -> AsyncIterator[str]:
    """Stream LLM response using OpenAI-compatible API."""
    client = AsyncOpenAI(
        base_url=settings.llm_base_url,
        api_key=settings.llm_api_key,
    )

    stream = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
