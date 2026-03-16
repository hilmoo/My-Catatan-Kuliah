# Embedder

Listens for PostgreSQL NOTIFY events on `course_notes`, breaks HTML content into chunks, produces embeddings, and saves them to `document_chunks` table.

## how it works

### Chunking: HTMLSemanticPreservingSplitter

jadinya pakai [`HTMLSemanticPreservingSplitter`](https://docs.langchain.com/oss/python/integrations/splitters/split_html) dari `langchain-text-splitters` yg memecah berdasarkan semnatic. Keunggulan dibanding `BeautifulSoup.get_text()` + `RecursiveCharacterTextSplitter`:

- **List (`<ul>`, `<ol>`) tidak terpecah** di tengah-tengah, dijamin satu chunk
- **Tabel (`<table>`) tetap utuh** dalam satu chunk
- **Header (`<h1>`-`<h3>`) menjadi metadata** tiap chunk (tp ngga kepake sih, cuma ambil page_content nya sekarang)

nambah custom handler untuk `<li>`:
- `<ul>` → `- item` (bullet)
- `<ol>` → `1. item` (numbered)

supaya full-text search (hybrid search) tetap optimal tanpa karakter spesial yang mengganggu tokenisasi

### Listener: asyncpg-listen

pake [`asyncpg-listen`](https://github.com/anna-money/asyncpg-listen) untuk LISTEN/NOTIFY

- **Auto-reconnect** jika koneksi database putus
- **`ListenPolicy.LAST`** — debounce, hanya proses notifikasi terakhir jika ada burst update beruntun
- **Timeout handling** built-in


## Setup

```bash 
devbox shell

cd embedder
uv sync
```

# konfigurasi
 file .env di root project (`My-Catatan-Kuliah/.env`):

```env
DATABASE_URL=postgresql://postgres:<ref>:<password>@<host>:5432/postgres
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

## running dev

```bash
cd embedder
uv run uvicorn main:app --port 8001 --reload
```



