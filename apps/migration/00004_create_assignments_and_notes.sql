-- +goose Up
-- +goose StatementBegin
CREATE TYPE assignment_status AS ENUM(
    'Todo',
    'InProgress',
    'Done'
);

CREATE TABLE "assignments"(
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "iid" uuid DEFAULT uuidv7() NOT NULL UNIQUE,
    "course_id" integer NOT NULL,
    "title" text NOT NULL DEFAULT 'Untitled Assignment',
    "content" text,
    "contentb" bytea,
    "status" assignment_status NOT NULL DEFAULT 'Todo',
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "due_date" timestamptz NOT NULL,
    "created_by" integer NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT NOW(),
    "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE "assignments"
    ADD FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE;

ALTER TABLE "assignments"
    ADD FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE INDEX idx_assignments_course ON "assignments"("course_id");
CREATE INDEX idx_assignments_status ON "assignments"("status");

CREATE TABLE "notes"(
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "iid" uuid DEFAULT uuidv7() NOT NULL UNIQUE,
    "course_id" integer NOT NULL,
    "title" text NOT NULL DEFAULT 'Untitled Note',
    "content" text,
    "contentb" bytea,
    "created_by" integer NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT NOW(),
    "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE "notes"
    ADD FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE;

ALTER TABLE "notes"
    ADD FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE INDEX idx_notes_course ON "notes"("course_id");
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "notes";
DROP TABLE IF EXISTS "assignments";
DROP TYPE IF EXISTS assignment_status;
-- +goose StatementEnd