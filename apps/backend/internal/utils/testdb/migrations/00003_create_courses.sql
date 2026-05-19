-- +goose Up
-- +goose StatementBegin
CREATE TABLE "courses"(
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "iid" uuid DEFAULT uuidv7() NOT NULL UNIQUE,
    "workspace_id" integer NOT NULL,
    "title" text NOT NULL,
    "instructor" text NOT NULL,
    "credits" integer NOT NULL,
        "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" text,
    "created_by" integer NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT NOW(),
    "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE "courses"
    ADD FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;

ALTER TABLE "courses"
    ADD FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE INDEX idx_courses_workspace ON "courses"("workspace_id");
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "courses";
-- +goose StatementEnd
