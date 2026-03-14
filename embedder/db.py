import psycopg
from psycopg.rows import dict_row


def get_connection(database_url: str) -> psycopg.Connection:
    """Create a new database connection"""
    return psycopg.connect(database_url, row_factory=dict_row, autocommit=True)


def get_note_metadata(conn: psycopg.Connection, note_id: int) -> dict | None:
    """Fetch course_id and workspace_id for a given note"""
    return conn.execute(
        """
        SELECT cn.course_id, c.workspace_id
        FROM course_notes cn
        JOIN courses c ON cn.course_id = c.id
        WHERE cn.id = %s
        """,
        [note_id],
    ).fetchone()


def upsert_chunks(
    conn: psycopg.Connection,
    note_id: int,
    course_id: int,
    workspace_id: int,
    chunks: list[str],
    embeddings: list[list[float]],
) -> None:
    """Delete old chunks for note_id, then insert new chunks (transactional)"""
    with conn.transaction():
        # Delete existing chunks for this note
        conn.execute(
            "DELETE FROM document_chunks WHERE note_id = %s",
            [note_id],
        )

        # Insert new chunks
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=True)):
            conn.execute(
                """
                INSERT INTO document_chunks
                    (note_id, course_id, workspace_id, chunk_index, content, embedding)
                VALUES (%s, %s, %s, %s, %s, %s::vector)
                """,
                [note_id, course_id, workspace_id, i, chunk, str(embedding)],
            )


def delete_chunks_for_note(conn: psycopg.Connection, note_id: int) -> None:
    """Delete all chunks for a given note (used on DELETE events)."""
    conn.execute(
        "DELETE FROM document_chunks WHERE note_id = %s",
        [note_id],
    )
