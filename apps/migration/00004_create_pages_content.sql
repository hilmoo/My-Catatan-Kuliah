-- +goose Up
-- +goose StatementBegin
CREATE TABLE "pages_content"(
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "page_id" integer NOT NULL,
    "content_html" text,
    "content_blob" bytea
);

ALTER TABLE "pages_content"
    ADD FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE;

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "pages_content";

-- +goose StatementEnd
