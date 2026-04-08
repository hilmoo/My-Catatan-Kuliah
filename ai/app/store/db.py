import uuid

import asyncpg


class DbRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        """
        Initialize with an active asyncpg connection pool.
        """
        self.pool = pool

    async def create_stream(
        self,
        chat_iid: str,
        user_id: int,
        workspace_id: int,
    ) -> tuple[int, str]:
        """Upsert chat in Postgres and register an active stream."""
        stream_id = f"stream-{uuid.uuid4().hex}"

        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO llm_chats (iid, user_id, workspace_id, active_stream_id)
                VALUES ($1::uuid, $2, $3, $4)
                ON CONFLICT (iid) DO UPDATE
                    SET user_id = EXCLUDED.user_id,
                        workspace_id = EXCLUDED.workspace_id,
                        active_stream_id = EXCLUDED.active_stream_id
                RETURNING id
                """,
                chat_iid,
                user_id,
                workspace_id,
                stream_id,
            )
        if row is None:
            msg = "Failed to create stream for chat"
            raise RuntimeError(msg)

        return row["id"], stream_id

    async def get_active_stream(self, chat_iid: str) -> str | None:
        """Check Postgres for an active stream ID. Returns None if no active stream."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT active_stream_id FROM llm_chats WHERE iid = $1::uuid",
                chat_iid,
            )
            if row is None:
                return None
            return row["active_stream_id"]

    async def clear_active_stream(self, chat_iid: str) -> None:
        """Clear active stream: null out Postgres active_stream_id."""
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE llm_chats SET active_stream_id = NULL WHERE iid = $1::uuid",
                chat_iid,
            )

    async def get_chat_history(
        self,
        chat_id: int,
        limit: int = 20,
    ) -> list[dict[str, str]]:
        """Return chat history as OpenAI-compatible messages."""

        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT m.role, COALESCE(string_agg(p.text, '' ORDER BY p.id), '') AS content
                FROM llm_chat_messages m
                LEFT JOIN llm_chat_message_parts p
                    ON p.llm_chat_messages_id = m.id
                WHERE m.llm_chats_id = $1
                GROUP BY m.id, m.role
                ORDER BY m.id DESC
                LIMIT $2
                """,
                chat_id,
                limit,
            )

        return [
            {"role": row["role"], "content": row["content"]}
            for row in reversed(rows)
            if row["content"]
        ]

    async def save_message(self, chat_id: int, role: str, text: str) -> int:
        """Persist a single chat message and its text part."""

        async with self.pool.acquire() as conn:
            message_id = await conn.fetchval(
                """
                INSERT INTO llm_chat_messages (llm_chats_id, role)
                VALUES ($1, $2)
                RETURNING id
                """,
                chat_id,
                role,
            )

            await conn.execute(
                """
                INSERT INTO llm_chat_message_parts (llm_chat_messages_id, text)
                VALUES ($1, $2)
                """,
                message_id,
                text,
            )

        return message_id

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
