-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "document_chunks"(
    "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "page_id" integer NOT NULL,
    "workspace_id" integer NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" text NOT NULL,
    "embedding" vector(384) NOT NULL,
    "fts_vector" tsvector GENERATED ALWAYS AS (to_tsvector('indonesian', content)) STORED,
    "created_at" timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE ("page_id", "chunk_index")
);

ALTER TABLE "document_chunks"
    ADD FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE;

ALTER TABLE "document_chunks"
    ADD FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id");

CREATE INDEX idx_chunks_embedding ON "document_chunks" USING ivfflat("embedding" vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_chunks_fts ON "document_chunks" USING gin("fts_vector");

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "document_chunks";

DROP EXTENSION IF EXISTS vector;

-- +goose StatementEnd
