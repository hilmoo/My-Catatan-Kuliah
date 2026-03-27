"""Stream store — Redis buffer + Postgres tracking for resumable streams.

Redis Streams (XADD/XREAD) buffer SSE chunks during active streaming.
Postgres tracks which chat has an active stream (activeStreamId pattern).
"""

import uuid

import asyncpg
import redis.asyncio as aioredis

from config import settings

# Redis connection pool (initialized on startup)
_redis: aioredis.Redis | None = None

# Redis key TTL for stream data (5 minutes)
STREAM_TTL_SECONDS = 300


async def init_redis() -> None:
    """Create the async Redis connection pool."""
    global _redis  # noqa: PLW0603
    _redis = aioredis.from_url(settings.redis_url, decode_responses=True)


def _get_redis() -> aioredis.Redis:
    """Get the Redis client, raising if not initialized."""
    if _redis is None:
        msg = "Redis not initialized. Call init_redis() first."
        raise RuntimeError(msg)
    return _redis


def _stream_key(stream_id: str) -> str:
    """Redis key for a stream's chunks."""
    return f"stream:{stream_id}"


async def create_stream(chat_id: str, user_id: str, workspace_id: int) -> str:
    """Register a new active stream: upsert chat in Postgres, return stream_id."""
    stream_id = f"stream-{uuid.uuid4().hex}"

    conn = await asyncpg.connect(settings.database_url)
    try:
        await conn.execute(
            """
            INSERT INTO chats (id, user_id, active_stream_id, workspace_id)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE
                SET active_stream_id = $3
            """,
            chat_id,
            user_id,
            stream_id,
            workspace_id,
        )
    finally:
        await conn.close()

    return stream_id


async def append_chunk(stream_id: str, chunk: str) -> None:
    """Buffer an SSE chunk to Redis Stream (XADD)."""
    r = _get_redis()
    key = _stream_key(stream_id)
    await r.xadd(key, {"data": chunk})
    # Set/refresh TTL so stale streams auto-expire
    await r.expire(key, STREAM_TTL_SECONDS)


async def get_active_stream(chat_id: str) -> str | None:
    """Check Postgres for an active stream ID. Returns None if no active stream."""
    conn = await asyncpg.connect(settings.database_url)
    try:
        row = await conn.fetchrow(
            "SELECT active_stream_id FROM chats WHERE id = $1",
            chat_id,
        )
        if row is None:
            return None
        return row["active_stream_id"]  # type: ignore[return-value]
    finally:
        await conn.close()


async def replay_stream(stream_id: str) -> list[str]:
    """Read all buffered SSE chunks from Redis Stream for replay."""
    r = _get_redis()
    key = _stream_key(stream_id)
    # XRANGE reads all entries from start to end
    entries = await r.xrange(key)
    return [entry[1]["data"] for entry in entries]


async def close_stream(chat_id: str, stream_id: str) -> None:
    """Clear active stream: null out Postgres, expire Redis key."""
    r = _get_redis()

    # Clear active_stream_id in Postgres
    conn = await asyncpg.connect(settings.database_url)
    try:
        await conn.execute(
            "UPDATE chats SET active_stream_id = NULL WHERE id = $1",
            chat_id,
        )
    finally:
        await conn.close()

    # Expire Redis stream data (short TTL for late reconnects)
    key = _stream_key(stream_id)
    await r.expire(key, 30)


async def close_redis() -> None:
    """Shutdown the Redis connection pool."""
    if _redis is not None:
        await _redis.aclose()
