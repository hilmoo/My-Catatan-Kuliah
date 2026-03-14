import logging

from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from config import settings
from chunker import process_html_to_chunks
from embedding import embed_texts
from db import get_connection, get_note_metadata, upsert_chunks, delete_chunks_for_note

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Embedder service belut ternate", version="0.1.0")


# --- Pydantic models for Supabase webhook payload ---

class WebhookRecord(BaseModel):
    """Represents a row from course_notes table"""
    id: int
    title: str | None = None
    content: str | None = None
    course_id: int | None = None
    created_by: int | None = None


class WebhookPayload(BaseModel):
    """Supabase Database Webhook payload format"""
    type: str  # "INSERT", "UPDATE", or "DELETE"
    table: str
    schema_: str | None = Field(None, alias="schema")
    record: WebhookRecord | None = None
    old_record: WebhookRecord | None = None

    model_config = {"populate_by_name": True}



# --- Background task: process embedding ---

def process_embedding(note_id: int, content: str):
    """Background task: chunk text, embed, and upsert to DB."""
    try:
        logger.info(f"Processing note_id={note_id}, content length={len(content)}")

        # 1. Chunk the HTML content
        chunks = process_html_to_chunks(
            content,
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )

        if not chunks:
            logger.warning(f"No chunks generated for note_id={note_id}")
            return

        logger.info(f"Generated {len(chunks)} chunks for note_id={note_id}")

        # 2. Embed all chunks
        embeddings = embed_texts(chunks, settings.embedding_model)
        logger.info(f"Generated {len(embeddings)} embeddings for note_id={note_id}")

        # 3. Get metadata (course_id, workspace_id) from DB
        conn = get_connection(settings.database_url)
        try:
            metadata = get_note_metadata(conn, note_id)
            if not metadata:
                logger.error(f"Note {note_id} not found in course_notes")
                return

            # 4. Upsert chunks to document_chunks
            upsert_chunks(
                conn,
                note_id=note_id,
                course_id=metadata["course_id"],
                workspace_id=metadata["workspace_id"],
                chunks=chunks,
                embeddings=embeddings,
            )
            logger.info(f"Successfully upserted {len(chunks)} chunks for note_id={note_id}")
        finally:
            conn.close()

    except Exception as e:
        logger.error(f"Error processing note_id={note_id}: {e}", exc_info=True)


# --- Endpoints ---

@app.get("/health")
def health():
    return {"status": "ok", "service": "embedder"}


@app.post("/webhook")
async def webhook(
    payload: WebhookPayload,
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(None),
):
    """Receive Supabase Database Webhook and process embeddings."""

    # Validate webhook secret (if configured)
    if settings.webhook_secret:
        expected = f"Bearer {settings.webhook_secret}"
        if authorization != expected:
            raise HTTPException(status_code=401, detail="Invalid webhook secret")

    event_type = payload.type.upper()
    logger.info(f"Received webhook: {event_type} on {payload.table}")

    if event_type in ("INSERT", "UPDATE"):
        record = payload.record
        if not record:
            raise HTTPException(status_code=400, detail="Missing record in payload")

        if not record.content:
            logger.info(f"Note {record.id} has no content, skipping")
            return {"status": "skipped", "reason": "empty content"}

        # Process in background so webhook returns quickly
        background_tasks.add_task(process_embedding, record.id, record.content)
        return {"status": "accepted", "note_id": record.id, "event": event_type}

    elif event_type == "DELETE":
        old_record = payload.old_record
        if not old_record:
            raise HTTPException(status_code=400, detail="Missing old_record in DELETE payload")

        # Delete chunks for this note
        conn = get_connection(settings.database_url)
        try:
            delete_chunks_for_note(conn, old_record.id)
            logger.info(f"Deleted chunks for note_id={old_record.id}")
        finally:
            conn.close()

        return {"status": "deleted", "note_id": old_record.id}

    else:
        return {"status": "ignored", "event": event_type}
