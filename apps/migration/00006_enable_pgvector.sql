-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "document_chunks"
(
    "id"            bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "note_id"       integer   NOT NULL,
    "course_id"     integer   NOT NULL,
    "workspace_id"  integer   NOT NULL,
    "chunk_index"   integer   NOT NULL,
    "content"       text      NOT NULL,
    "embedding"     vector(384) NOT NULL,
    "fts_vector"    tsvector  GENERATED ALWAYS AS (to_tsvector('indonesian', content)) STORED,
    "created_at"    timestamp NOT NULL DEFAULT NOW(),
    UNIQUE ("note_id", "chunk_index")
);

ALTER TABLE "document_chunks"
    ADD FOREIGN KEY ("note_id") REFERENCES "course_notes" ("id") ON DELETE CASCADE;

ALTER TABLE "document_chunks"
    ADD FOREIGN KEY ("course_id") REFERENCES "courses" ("id");

ALTER TABLE "document_chunks"
    ADD FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id");

-- index untuk semantic search (cosine similarity)
CREATE INDEX idx_chunks_embedding ON "document_chunks"
    USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- index untuk keyword search (FTS)
CREATE INDEX idx_chunks_fts ON "document_chunks" USING gin("fts_vector");

-- index untuk filter by workspace (multi-tenancy)
CREATE INDEX idx_chunks_workspace ON "document_chunks" ("workspace_id");
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_chunks_workspace;
DROP INDEX IF EXISTS idx_chunks_fts;
DROP INDEX IF EXISTS idx_chunks_embedding;
DROP TABLE IF EXISTS "document_chunks";
DROP EXTENSION IF EXISTS vector;
-- +goose StatementEnd
