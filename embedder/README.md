# Embedder

Process notes into vector embedding. Receive a webhook from supabase, breaks HTML contents into chunks, produce embeddings, and save it to `document_chunks` table.

## Setup

```bash 
devbox shell

cd embedder
uv sync
```

# konfigurasi
 file .env di root project (`My-Catatan-Kuliah/.env`):

```env
DATABASE_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres
WEBHOOK_SECRET=          
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

## running dev

```bash
cd embedder
uv run uvicorn main:app --port 8001 --reload
```

## webhook payload

Formatnya Supabase Webhook Payload

```json
{
  "type": "INSERT",
  "table": "course_notes",
  "schema": "public",
  "record": {
    "id": 1,
    "title": "Anu",
    "content": "<h1>Anu</h1><p>...</p>",
    "course_id": 1
  }
}
```

