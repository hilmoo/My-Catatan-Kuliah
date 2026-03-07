-- +goose Up
-- +goose StatementBegin
CREATE TABLE "workspaces"
(
    "id"         integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "name"       text      NOT NULL,
    "owner_id"   integer   NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT NOW()
);
ALTER TABLE "workspaces"
    ADD FOREIGN KEY ("owner_id") REFERENCES "users" ("id");
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE "workspaces";
-- +goose StatementEnd
