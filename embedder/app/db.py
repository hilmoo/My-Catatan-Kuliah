import asyncpg


class DatabaseRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self.pool = pool

    async def get_workspace_id(self, entity_type: str, entity_id: int) -> int | None:
        """Fetch the workspace_id for a given assignment or note."""
        table_name = "assignments" if entity_type == "assignment" else "notes"
        async with self.pool.acquire() as conn:
            # Both assignments and notes have course_id, and courses has workspace_id
            query = f"""
                SELECT c.workspace_id
                FROM {table_name} e
                JOIN courses c ON e.course_id = c.id
                WHERE e.id = $1
            """  # noqa: S608
            record = await conn.fetchrow(query, entity_id)
            return record["workspace_id"] if record else None

    async def get_content_markdown(
        self, entity_type: str, entity_id: int
    ) -> str | None:
        """Fetch the markdown content for a given assignment or note."""
        table_name = "assignments" if entity_type == "assignment" else "notes"
        async with self.pool.acquire() as conn:
            # assignments and notes have 'content' column for markdown
            record = await conn.fetchrow(
                f"SELECT content FROM {table_name} WHERE id = $1",
                entity_id,  # noqa: S608
            )
            return record["content"] if record else None

    async def get_existing_hashes(self, entity_type: str, entity_id: int) -> set[str]:
        """Fetch hashes of chunks that currently exist in the database."""
        async with self.pool.acquire() as conn:
            records = await conn.fetch(
                "SELECT chunk_hash FROM document_chunks WHERE entity_type = $1 AND entity_id = $2",
                entity_type,
                entity_id,
            )
            return {record["chunk_hash"] for record in records}

    async def apply_sync(
        self,
        entity_type: str,
        entity_id: int,
        hashes_to_delete: set[str],
        chunks_to_insert: list[tuple],
    ) -> None:
        """Delta update: Execute deletions and insertions in a single transaction."""
        async with self.pool.acquire() as conn, conn.transaction():
            if hashes_to_delete:
                await conn.execute(
                    "DELETE FROM document_chunks WHERE entity_type = $1 AND entity_id = $2 AND chunk_hash = ANY($3)",
                    entity_type,
                    entity_id,
                    list(hashes_to_delete),
                )

            if chunks_to_insert:
                # chunks_to_insert tuples: (workspace_id, entity_type, entity_id, chunk_index, chunk_hash, content, embedding)
                await conn.executemany(
                    """
                    INSERT INTO document_chunks (workspace_id, entity_type, entity_id, chunk_index, chunk_hash, content, embedding)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    chunks_to_insert,
                )
