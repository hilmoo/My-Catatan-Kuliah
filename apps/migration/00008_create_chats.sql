-- +goose Up
-- +goose StatementBegin
CREATE TABLE "chats"(
    "id" text PRIMARY KEY,
    "user_id" text NOT NULL,
    "active_stream_id" text,
    "workspace_id" integer NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE "chats"
    ADD FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id");

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "chats";

-- +goose StatementEnd
