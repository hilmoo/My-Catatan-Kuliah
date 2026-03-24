-- +goose Up
-- +goose StatementBegin
CREATE TYPE page_type AS ENUM(
    'folder',
    'course',
    'assignment',
    'note'
);

CREATE TABLE "pages"(
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "iid" uuid DEFAULT uuidv7() NOT NULL,
    "workspace_id" integer NOT NULL,
    "parent_id" integer REFERENCES "pages"("id") ON DELETE CASCADE,
    "title" text NOT NULL DEFAULT 'Untitled',
    "icon" text,
    "type" page_type NOT NULL DEFAULT 'note',
    "properties" jsonb DEFAULT '{}',
    "created_by" integer NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT NOW(),
    "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE "pages"
    ADD FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id");

ALTER TABLE "pages"
    ADD FOREIGN KEY ("created_by") REFERENCES "users"("id");

CREATE INDEX idx_pages_parent ON "pages"("parent_id");

CREATE INDEX idx_pages_workspace ON "pages"("workspace_id");

CREATE INDEX idx_pages_type ON "pages"("type");

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "pages";

DROP TYPE IF EXISTS page_type;

-- +goose StatementEnd
