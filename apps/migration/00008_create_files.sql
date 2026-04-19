-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS files (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    s3_key text NOT NULL,
    mime_type text NOT NULL,
    size bigint NOT NULL,
    created_by integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS files;
-- +goose StatementEnd
