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
        chat_iid: uuid.UUID,
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
                    SET active_stream_id = EXCLUDED.active_stream_id
                    WHERE llm_chats.user_id = EXCLUDED.user_id
                      AND llm_chats.workspace_id = EXCLUDED.workspace_id
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
                embedding,
                query,
                workspace_id,
                match_count,
            )

        return [dict(r) for r in rows]

    async def _hybrid_search_candidates(
        self,
        conn: asyncpg.Connection,
        query: str,
        embedding: list[float],
        workspace_id: int,
        match_count: int,
        excluded_chunk_ids: list[int],
        *,
        course_id: int | None = None,
        note_id: int | None = None,
    ) -> list[dict[str, object]]:
        """Run hybrid search against one explicit scope."""
        scope_clause = "dc.workspace_id = $3"
        params: list[object] = [
            embedding,
            query,
            workspace_id,
            match_count,
            excluded_chunk_ids,
        ]

        if note_id is not None:
            scope_clause += """
                AND dc.entity_type = 'note'
                AND dc.entity_id = $6
            """
            params.append(note_id)
        elif course_id is not None:
            scope_clause += """
                AND (
                    (
                        dc.entity_type = 'note'
                        AND EXISTS (
                            SELECT 1
                            FROM notes n
                            WHERE n.id = dc.entity_id
                              AND n.course_id = $6
                        )
                    )
                    OR (
                        dc.entity_type = 'assignment'
                        AND EXISTS (
                            SELECT 1
                            FROM assignments a
                            WHERE a.id = dc.entity_id
                              AND a.course_id = $6
                        )
                    )
                )
            """
            params.append(course_id)

        rows = await conn.fetch(
            f"""
            WITH candidate_chunks AS (
                SELECT dc.*
                FROM document_chunks dc
                WHERE {scope_clause}
                  AND NOT (dc.id = ANY($5::bigint[]))
            ),
            semantic_search AS (
                SELECT cc.id,
                    cc.entity_type,
                    cc.entity_id,
                    cc.chunk_index,
                    cc.content,
                    ROW_NUMBER() OVER(ORDER BY cc.embedding <=> $1::vector) AS rank
                FROM candidate_chunks cc
                ORDER BY cc.embedding <=> $1::vector
                LIMIT $4 * 2
            ),
            keyword_search AS (
                SELECT cc.id,
                    cc.entity_type,
                    cc.entity_id,
                    cc.chunk_index,
                    cc.content,
                    ROW_NUMBER() OVER(
                        ORDER BY ts_rank_cd(
                            cc.fts_vector,
                            websearch_to_tsquery('indonesian', $2)
                        ) DESC
                    ) AS rank
                FROM candidate_chunks cc
                WHERE cc.fts_vector @@ websearch_to_tsquery('indonesian', $2)
                LIMIT $4 * 2
            )
            SELECT COALESCE(s.id, k.id) AS id,
                COALESCE(s.entity_type, k.entity_type) AS entity_type,
                COALESCE(s.entity_id, k.entity_id) AS entity_id,
                COALESCE(s.chunk_index, k.chunk_index) AS chunk_index,
                COALESCE(s.content, k.content) AS content,
                (
                    COALESCE(0.5 / (60 + s.rank), 0.0)
                    + COALESCE(0.5 / (60 + k.rank), 0.0)
                )::float AS rrf_score
            FROM semantic_search s
                FULL OUTER JOIN keyword_search k ON s.id = k.id
            ORDER BY rrf_score DESC
            LIMIT $4
            """,
            *params,
        )

        return [dict(r) for r in rows]

    async def contextual_hybrid_search(
        self,
        query: str,
        embedding: list[float],
        workspace_id: int,
        *,
        course_id: int | None = None,
        note_id: int | None = None,
        match_count: int = 10,
    ) -> list[dict[str, object]]:
        """Search note context first, then course, then the whole workspace."""
        chunks: list[dict[str, object]] = []
        excluded_chunk_ids: list[int] = []

        async with self.pool.acquire() as conn:
            if note_id is not None:
                note_chunks = await self._hybrid_search_candidates(
                    conn,
                    query,
                    embedding,
                    workspace_id,
                    match_count,
                    excluded_chunk_ids,
                    note_id=note_id,
                )
                for chunk in note_chunks:
                    chunk["scope"] = "active_note"
                chunks.extend(note_chunks)
                excluded_chunk_ids.extend(int(chunk["id"]) for chunk in note_chunks)

            remaining_count = match_count - len(chunks)
            if course_id is not None and remaining_count > 0:
                course_chunks = await self._hybrid_search_candidates(
                    conn,
                    query,
                    embedding,
                    workspace_id,
                    remaining_count,
                    excluded_chunk_ids,
                    course_id=course_id,
                )
                for chunk in course_chunks:
                    chunk["scope"] = "course"
                chunks.extend(course_chunks)
                excluded_chunk_ids.extend(int(chunk["id"]) for chunk in course_chunks)

            remaining_count = match_count - len(chunks)
            if remaining_count > 0:
                workspace_chunks = await self._hybrid_search_candidates(
                    conn,
                    query,
                    embedding,
                    workspace_id,
                    remaining_count,
                    excluded_chunk_ids,
                )
                for chunk in workspace_chunks:
                    chunk["scope"] = "workspace"
                chunks.extend(workspace_chunks)

        return chunks

    async def is_stream_active(self, chat_iid: uuid.UUID) -> bool:
        """Check if the stream is still active in Postgres."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT active_stream_id FROM llm_chats WHERE iid = $1::uuid",
                chat_iid,
            )
            return row is not None and row["active_stream_id"] is not None

    async def resolve_user_id(self, user_iid: uuid.UUID) -> int:
        """Resolve a user's UUID (iid) to their integer ID."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchval(
                "SELECT id FROM users WHERE iid = $1::uuid",
                user_iid,
            )
        if row is None:
            msg = f"User not found for iid={user_iid}"
            raise ValueError(msg)
        return row

    async def resolve_workspace_id(self, workspace_iid: uuid.UUID) -> int:
        """Resolve a workspace's UUID (iid) to its integer ID."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchval(
                "SELECT id FROM workspaces WHERE iid = $1::uuid",
                workspace_iid,
            )
        if row is None:
            msg = f"Workspace not found for iid={workspace_iid}"
            raise ValueError(msg)
        return row

    async def resolve_course_id(self, course_iid: uuid.UUID, workspace_id: int) -> int:
        """Resolve a course UUID to its integer ID within the active workspace."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchval(
                """
                SELECT id
                FROM courses
                WHERE iid = $1::uuid
                  AND workspace_id = $2
                """,
                course_iid,
                workspace_id,
            )
        if row is None:
            msg = f"Course not found for iid={course_iid} workspace_id={workspace_id}"
            raise ValueError(msg)
        return row

    async def resolve_note_id(
        self, note_iid: uuid.UUID, workspace_id: int
    ) -> tuple[int, int]:
        """Resolve a note UUID to its integer ID and course ID in the workspace."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT n.id, n.course_id
                FROM notes n
                JOIN courses c ON c.id = n.course_id
                WHERE n.iid = $1::uuid
                  AND c.workspace_id = $2
                """,
                note_iid,
                workspace_id,
            )
        if row is None:
            msg = f"Note not found for iid={note_iid} workspace_id={workspace_id}"
            raise ValueError(msg)
        return row["id"], row["course_id"]
