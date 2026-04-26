"""Redis buffer for resumable streams."""

import redis.asyncio as aioredis


class RedisRepository:
    def __init__(
        self,
        redis_client: aioredis.Redis,
        stream_ttl_seconds: int = 300,
        close_ttl_seconds: int = 30,
    ) -> None:
        """
        Initialize with a Redis client and configurable TTL settings.
        """
        self.redis = redis_client
        self.stream_ttl_seconds = stream_ttl_seconds
        self.close_ttl_seconds = close_ttl_seconds

    def _stream_key(self, stream_id: str) -> str:
        """Redis key for a stream's chunks."""
        return f"stream:{stream_id}"

    async def append_chunk(self, stream_id: str, chunk: str) -> None:
        """Buffer an SSE chunk to Redis Stream (XADD)."""
        key = self._stream_key(stream_id)

        async with self.redis.pipeline(transaction=False) as pipe:
            pipe.xadd(key, {"data": chunk})
            pipe.expire(key, self.stream_ttl_seconds)
            await pipe.execute()

    async def replay_stream(self, stream_id: str) -> list[str]:
        """Read all buffered SSE chunks from Redis Stream for replay."""
        key = self._stream_key(stream_id)

        # XRANGE reads all entries from start to end
        entries = await self.redis.xrange(key)
        return [entry[1]["data"] for entry in entries]

    async def expire_stream(self, stream_id: str) -> None:
        """Expiring Redis stream data (short TTL for late reconnects)."""
        key = self._stream_key(stream_id)
        await self.redis.expire(key, self.close_ttl_seconds)

    async def read_stream_blocking(
        self, stream_id: str, last_id: str, block_ms: int = 2000
    ) -> list[str]:
        """Blocking read for new chunks from Redis Stream (XREAD)."""
        key = self._stream_key(stream_id)

        # XREAD blocks until new entries after last_id are available
        result = await self.redis.xread({key: last_id}, block=block_ms)
        if not result:
            return []

        # result format: [(key, [(entry_id, {field: value})])]
        _, entries = result[0]
        return [entry[1]["data"] for entry in entries]
