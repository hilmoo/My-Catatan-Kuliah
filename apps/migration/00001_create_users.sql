-- +goose Up
-- +goose StatementBegin
CREATE TABLE "users"
(
    "id"         integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "username"   text      NOT NULL UNIQUE,
    "email"      text      NOT NULL UNIQUE,
    "password"   text      NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE "users";
-- +goose StatementEnd
