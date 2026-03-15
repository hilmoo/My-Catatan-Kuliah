import asyncpg


async def get_connection(database_url: str) -> asyncpg.Connection:
    """Create a new async database connection"""
    return await asyncpg.connect(database_url)


async def get_note_metadata(
    conn: asyncpg.Connection, note_id: int
) -> asyncpg.Record | None:
    """Fetch course_id and workspace_id for a given note"""
    return await conn.fetchrow(
        """
        SELECT cn.course_id, c.workspace_id
        FROM course_notes cn
        JOIN courses c ON cn.course_id = c.id
        WHERE cn.id = $1
        """,
        note_id,
    )


async def fetch_note_content(conn: asyncpg.Connection, note_id: int) -> str | None:
    """Fetch content for a given note (LISTEN only sends id, not content)"""
    return await conn.fetchval(
        "SELECT content FROM course_notes WHERE id = $1",
        note_id,
    )


async def upsert_chunks(
    conn: asyncpg.Connection,
    note_id: int,
    course_id: int,
    workspace_id: int,
    chunks: list[str],
    embeddings: list[list[float]],
) -> None:
    """Delete old chunks for note_id, then insert new chunks (transactional)"""
    async with conn.transaction():
        await conn.execute(
            "DELETE FROM document_chunks WHERE note_id = $1",
            note_id,
        )

        values = [
            (note_id, course_id, workspace_id, i, chunk, str(embedding))
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=True))
        ]

        await conn.executemany(
            """
            INSERT INTO document_chunks
                (note_id, course_id, workspace_id, chunk_index, content, embedding)
            VALUES ($1, $2, $3, $4, $5, $6::vector)
            """,
            values,
        )


async def delete_chunks_for_note(conn: asyncpg.Connection, note_id: int) -> None:
    """Delete all chunks for a given note (used on DELETE events)"""
    await conn.execute(
        "DELETE FROM document_chunks WHERE note_id = $1",
        note_id,
    )
