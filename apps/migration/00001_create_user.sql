-- +goose Up
-- +goose StatementBegin
CREATE TYPE provider AS ENUM(
    'google'
);

CREATE TABLE users(
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "iid" uuid NOT NULL UNIQUE DEFAULT uuidv7(),
    "email" text UNIQUE NOT NULL,
    "name" text NOT NULL,
    "avatar_url" text,
    "provider" provider NOT NULL,
    "provider_id" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE "sessions"(
    "id" uuid PRIMARY KEY DEFAULT uuidv7(),
    "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "hash_token" text NOT NULL UNIQUE,
    "expires_at" timestamptz NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "created_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "sessions";

DROP TABLE IF EXISTS "users";

-- +goose StatementEnd
