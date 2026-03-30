import logging

import asyncpg
from sentence_transformers import SentenceTransformer

from app.config import settings

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    """Load embedding model lazily (singleton)."""
    global _model  # noqa: PLW0603
    if _model is None:
        _model = SentenceTransformer(settings.embedding_model)
    return _model


def embed_query(text: str) -> list[float]:
    """Embed a single query text into a vector."""
    model = get_model()
    embedding = model.encode(text, show_progress_bar=False)
    return embedding.tolist()


async def hybrid_search(
    query: str, workspace_id: int, match_count: int = 10
) -> list[dict[str, object]]:
    """Embed query and call hybrid_search() RPC to retrieve relevant chunks."""
    embedding = embed_query(query)

    conn = await asyncpg.connect(settings.database_url)
    try:
        rows = await conn.fetch(
            "SELECT * FROM hybrid_search($1::vector, $2, $3, $4)",
            str(embedding),
            query,
            workspace_id,
            match_count,
        )
    finally:
        await conn.close()
    return [dict(r) for r in rows]
