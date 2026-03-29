import asyncio
import json
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg_listen
from fastapi import FastAPI

import proto.embedder.v1.newcontent_pb2 as proto

from chunker import process_html_to_chunks
from config import settings
from db import (
    delete_chunks_for_note,
    fetch_note_content,
    get_connection,
    get_note_metadata,
    upsert_chunks,
)
from embedding import embed_texts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# --- Core processing logic ---


async def process_embedding(note_id: int) -> None:
    """Fetch content from DB, chunk, embed, and upsert"""
    conn = await get_connection(settings.database_url)
    try:
        # 1. Fetch latest content from DB
        content = await fetch_note_content(conn, note_id)
        if not content:
            logger.info("Note %s has no content, skipping", note_id)
            return

        logger.info("Processing note_id=%s, content length=%s", note_id, len(content))

        # 2. Chunk the HTML content (semantic, preserves lists/tables)
        chunks = process_html_to_chunks(
            content,
            chunk_size=settings.chunk_size,
        )

        if not chunks:
            logger.warning("No chunks generated for note_id=%s", note_id)
            return

        logger.info("Generated %s chunks for note_id=%s", len(chunks), note_id)

        # 3. Embed all chunks
        embeddings = embed_texts(chunks, settings.embedding_model)
        logger.info("Generated %s embeddings for note_id=%s", len(embeddings), note_id)

        # 4. Get metadata (course_id, workspace_id) from DB
        metadata = await get_note_metadata(conn, note_id)
        if not metadata:
            logger.error("Note %s not found in course_notes", note_id)
            return

        # 5. Upsert chunks to document_chunks
        await upsert_chunks(
            conn,
            note_id=note_id,
            course_id=metadata["course_id"],
            workspace_id=metadata["workspace_id"],
            chunks=chunks,
            embeddings=embeddings,
        )
        logger.info(
            "Successfully upserted %s chunks for note_id=%s", len(chunks), note_id
        )

    except Exception:
        logger.exception("Error processing note_id=%s", note_id)
    finally:
        await conn.close()


# --- LISTEN/NOTIFY handler (asyncpg-listen) ---


async def handle_notification(
    notification: asyncpg_listen.NotificationOrTimeout,
) -> None:
    """Called when a NOTIFY event is received on 'note_changed' channel"""
    if isinstance(notification, asyncpg_listen.Timeout):
        return

    try:
        if not notification.payload:
            logger.warning("Received NOTIFY without payload")
            return

        data = json.loads(notification.payload)
        note_id = data["id"]
        event_type = data["type"]

        logger.info("Received NOTIFY: %s on note_id=%s", event_type, note_id)

        if event_type in ("INSERT", "UPDATE"):
            await process_embedding(note_id)

        elif event_type == "DELETE":
            del_conn = await get_connection(settings.database_url)
            try:
                await delete_chunks_for_note(del_conn, note_id)
                logger.info("Deleted chunks for note_id=%s", note_id)
            finally:
                await del_conn.close()

    except Exception:
        logger.exception("Error handling notification")


# --- FastAPI lifespan ---


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Create listener with auto-reconnect
    listener = asyncpg_listen.NotificationListener(
        asyncpg_listen.connect_func(dsn=settings.database_url)
    )

    # Start listener task — LAST policy = only process latest notification (debounce)
    listener_task = asyncio.create_task(
        listener.run(
            {"note_changed": handle_notification},
            policy=asyncpg_listen.ListenPolicy.LAST,
            notification_timeout=30,
        )
    )
    logger.info("Embedder service started, listening on 'note_changed' channel")
    yield
    # Shutdown
    listener_task.cancel()
    logger.info("Embedder service shutting down")


app = FastAPI(
    title="Embedder service belut ternate",
    version="0.3.0",
    lifespan=lifespan,
)


# --- Endpoints ---


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "embedder"}
