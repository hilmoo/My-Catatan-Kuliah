-- +goose Up
-- +goose StatementBegin
CREATE TYPE assignment_status AS ENUM (
    'pending',
    'in_progress',
    'submitted',
    'graded',
    'overdue'
    );

CREATE TABLE "assignments"
(
    "id"          integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "title"       text              NOT NULL,
    "description" text,
    "deadline"    timestamp         NOT NULL,
    "status"      assignment_status NOT NULL DEFAULT 'pending',
    "course_id"   integer           NOT NULL,
    "created_by"  integer           NOT NULL,
    "created_at"  timestamp         NOT NULL DEFAULT NOW(),
    "updated_at"  timestamp         NOT NULL DEFAULT NOW()
);

ALTER TABLE "assignments"
    ADD FOREIGN KEY ("course_id") REFERENCES "courses" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "assignments"
    ADD FOREIGN KEY ("created_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE TRIGGER set_updated_at_assignments
    BEFORE UPDATE
    ON "assignments"
    FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER set_updated_at_assignments ON "assignments";
DROP TABLE "assignments";
DROP TYPE assignment_status;
-- +goose StatementEnd
