# Embedder

Listens for PostgreSQL NOTIFY events on `course_notes`, breaks HTML content into chunks, produces embeddings, and saves them to `document_chunks` table.

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



