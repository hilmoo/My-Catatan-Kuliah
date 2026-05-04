-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE entity_type AS ENUM(
    'assignment',
    'note'
);

CREATE TABLE "document_chunks"(
    "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "workspace_id" integer NOT NULL,
    "entity_type" entity_type NOT NULL,
    "entity_id" integer NOT NULL,
    "chunk_index" integer NOT NULL,
    "chunk_hash" text NOT NULL,
    "content" text NOT NULL,
    "embedding" vector(384) NOT NULL,
    "fts_vector" tsvector GENERATED ALWAYS AS (to_tsvector('indonesian', content)) STORED,
    "created_at" timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE ("entity_type", "entity_id", "chunk_index")
);

ALTER TABLE "document_chunks"
    ADD FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;

CREATE INDEX idx_chunks_embedding ON "document_chunks" USING ivfflat("embedding" vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_chunks_fts ON "document_chunks" USING gin("fts_vector");

CREATE INDEX idx_document_chunks_entity ON document_chunks(entity_type, entity_id);

CREATE INDEX idx_document_chunks_workspace ON document_chunks(workspace_id);

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "document_chunks";

DROP TYPE IF EXISTS entity_type;

DROP EXTENSION IF EXISTS vector;

-- +goose StatementEnd
