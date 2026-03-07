-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
    RETURNS TRIGGER AS
$$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE "course_notes"
(
    "id"           integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "title"        text      NOT NULL,
    "content"      text,
    "content_blob" bytea,
    "course_id"    integer   NOT NULL,
    "created_by"   integer   NOT NULL,
    "created_at"   timestamp NOT NULL DEFAULT NOW(),
    "updated_at"   timestamp NOT NULL DEFAULT NOW()
);

ALTER TABLE "course_notes"
    ADD FOREIGN KEY ("course_id") REFERENCES "courses" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "course_notes"
    ADD FOREIGN KEY ("created_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE TRIGGER set_updated_at_course_notes
    BEFORE UPDATE
    ON "course_notes"
    FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER set_updated_at_course_notes ON "course_notes";
DROP TABLE "course_notes";
DROP FUNCTION trigger_set_updated_at();
-- +goose StatementEnd
