import asyncpg


class DatabaseRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self.pool = pool

    async def get_workspace_id(self, page_id: int) -> int | None:
        """Fetch the workspace_id for a given page_id."""
        async with self.pool.acquire() as conn:
            record = await conn.fetchrow(
                "SELECT workspace_id FROM pages WHERE id = $1", page_id
            )
            return record["workspace_id"] if record else None

    async def get_content_markdown(self, page_id: int) -> str | None:
        """Fetch the markdown content for a given page_id."""
        async with self.pool.acquire() as conn:
            record = await conn.fetchrow(
                "SELECT content_markdown FROM pages_content WHERE page_id = $1", page_id
            )
            return record["content_markdown"] if record else None

    async def get_existing_hashes(self, page_id: int) -> set[str]:
        """Fetch hashes of chunks that currently exist in the database."""
        async with self.pool.acquire() as conn:
            records = await conn.fetch(
                "SELECT chunk_hash FROM document_chunks WHERE page_id = $1", page_id
            )
            return {record["chunk_hash"] for record in records}

    async def apply_sync(
        self,
        page_id: int,
        hashes_to_delete: set[str],
        chunks_to_insert: list[tuple],
    ) -> None:
        """Delta update: Execute deletions and insertions in a single transaction."""
        async with self.pool.acquire() as conn, conn.transaction():
            if hashes_to_delete:
                await conn.execute(
                    "DELETE FROM document_chunks WHERE page_id = $1 AND chunk_hash = ANY($2)",
                    page_id,
                    list(hashes_to_delete),
                )

            if chunks_to_insert:
                await conn.executemany(
                    """
                    INSERT INTO document_chunks (page_id, chunk_index, content, embedding, chunk_hash, workspace_id)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    chunks_to_insert,
                )
