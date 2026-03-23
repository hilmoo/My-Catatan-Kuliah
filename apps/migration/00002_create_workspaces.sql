-- +goose Up
-- +goose StatementBegin
CREATE TABLE "workspaces"(
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "iid" uuid DEFAULT uuidv7() NOT NULL,
    "name" text NOT NULL,
    "owner_id" integer NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE "workspaces"
    ADD FOREIGN KEY ("owner_id") REFERENCES "users"("id");

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "workspaces";

-- +goose StatementEnd
