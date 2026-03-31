import uuid

import asyncpg


class DbRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        """
        Initialize with an active asyncpg connection pool.
        """
        self.pool = pool

    async def create_stream(self, chat_id: str, user_id: int, workspace_id: int) -> str:
        """Register a new active stream: upsert chat in Postgres, return stream_id."""
        stream_id = f"stream-{uuid.uuid4().hex}"

        async with self.pool.acquire() as conn:
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

        return stream_id

    async def get_active_stream(self, chat_id: str) -> str | None:
        """Check Postgres for an active stream ID. Returns None if no active stream."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT active_stream_id FROM chats WHERE id = $1",
                chat_id,
            )
            if row is None:
                return None
            return row["active_stream_id"]

    async def clear_active_stream(self, chat_id: str) -> None:
        """Clear active stream: null out Postgres active_stream_id."""
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE chats SET active_stream_id = NULL WHERE id = $1",
                chat_id,
            )

    async def hybrid_search(
        self,
        query: str,
        embedding: list[float],
        workspace_id: int,
        match_count: int = 10,
    ) -> list[dict[str, object]]:
        """Call hybrid_search() RPC using a precomputed embedding."""

        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM hybrid_search($1::vector, $2, $3, $4)",
                str(embedding),
                query,
                workspace_id,
                match_count,
            )

        return [dict(r) for r in rows]
