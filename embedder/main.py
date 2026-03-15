import json
import asyncio
import logging

import asyncpg
from fastapi import FastAPI
from contextlib import asynccontextmanager

from config import settings
from chunker import process_html_to_chunks
from embedding import embed_texts
from db import (
    get_connection,
    get_note_metadata,
    fetch_note_content,
    upsert_chunks,
    delete_chunks_for_note,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# --- Core processing logic ---

async def process_embedding(note_id: int):
    """Fetch content from DB, chunk, embed, and upsert"""
    conn = await get_connection(settings.database_url)
    try:
        # 1. Fetch latest content from DB
        content = await fetch_note_content(conn, note_id)
        if not content:
            logger.info(f"Note {note_id} has no content, skipping")
            return

        logger.info(f"Processing note_id={note_id}, content length={len(content)}")

        # 2. Chunk the HTML content
        chunks = process_html_to_chunks(
            content,
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )

        if not chunks:
            logger.warning(f"No chunks generated for note_id={note_id}")
            return

        logger.info(f"Generated {len(chunks)} chunks for note_id={note_id}")

        # 3. Embed all chunks
        embeddings = embed_texts(chunks, settings.embedding_model)
        logger.info(f"Generated {len(embeddings)} embeddings for note_id={note_id}")

        # 4. Get metadata (course_id, workspace_id) from DB
        metadata = await get_note_metadata(conn, note_id)
        if not metadata:
            logger.error(f"Note {note_id} not found in course_notes")
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
        logger.info(f"Successfully upserted {len(chunks)} chunks for note_id={note_id}")

    except Exception as e:
        logger.error(f"Error processing note_id={note_id}: {e}", exc_info=True)
    finally:
        await conn.close()


# --- LISTEN/NOTIFY handler ---

async def handle_notification(conn, pid, channel, payload):
    """Called when a NOTIFY event is received on 'note_changed' channel"""
    try:
        data = json.loads(payload)
        note_id = data["id"]
        event_type = data["type"]

        logger.info(f"Received NOTIFY: {event_type} on note_id={note_id}")

        if event_type in ("INSERT", "UPDATE"):
            await process_embedding(note_id)

        elif event_type == "DELETE":
            del_conn = await get_connection(settings.database_url)
            try:
                await delete_chunks_for_note(del_conn, note_id)
                logger.info(f"Deleted chunks for note_id={note_id}")
            finally:
                await del_conn.close()

    except Exception as e:
        logger.error(f"Error handling notification: {e}", exc_info=True)


async def start_listener():
    """Connect to Postgres and LISTEN for note changes"""
    while True:
        try:
            conn = await asyncpg.connect(settings.database_url)
            logger.info("Connected to Postgres, listening on 'note_changed' channel")

            await conn.add_listener("note_changed", handle_notification)

            # Keep connection alive
            while True:
                await asyncio.sleep(60)

        except (asyncpg.PostgresConnectionError, OSError) as e:
            logger.error(f"Listener connection lost: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)
        except Exception as e:
            logger.error(f"Unexpected listener error: {e}", exc_info=True)
            await asyncio.sleep(5)


# --- FastAPI lifespan ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch listener as background task
    listener_task = asyncio.create_task(start_listener())
    logger.info("Embedder service started, LISTEN loop running")
    yield
    # Shutdown: cancel listener
    listener_task.cancel()
    logger.info("Embedder service shutting down")


app = FastAPI(
    title="Embedder service belut ternate",
    version="0.2.0",
    lifespan=lifespan,
)


# --- Endpoints ---


@app.get("/health")
def health():
    return {"status": "ok", "service": "embedder"}
