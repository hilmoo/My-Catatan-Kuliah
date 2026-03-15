-- +goose Up
-- +goose StatementBegin

ALTER TABLE "users" ADD COLUMN "public_id" UUID DEFAULT uuidv7() NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_public_id_unique" UNIQUE ("public_id");

ALTER TABLE "workspaces" ADD COLUMN "public_id" UUID DEFAULT uuidv7() NOT NULL;
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_public_id_unique" UNIQUE ("public_id");

ALTER TABLE "courses" ADD COLUMN "public_id" UUID DEFAULT uuidv7() NOT NULL;
ALTER TABLE "courses" ADD CONSTRAINT "courses_public_id_unique" UNIQUE ("public_id");

ALTER TABLE "course_notes" ADD COLUMN "public_id" UUID DEFAULT uuidv7() NOT NULL;
ALTER TABLE "course_notes" ADD CONSTRAINT "course_notes_public_id_unique" UNIQUE ("public_id");

ALTER TABLE "assignments" ADD COLUMN "public_id" UUID DEFAULT uuidv7() NOT NULL;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_public_id_unique" UNIQUE ("public_id");

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE "assignments" DROP COLUMN "public_id";
ALTER TABLE "course_notes" DROP COLUMN "public_id";
ALTER TABLE "courses" DROP COLUMN "public_id";
ALTER TABLE "workspaces" DROP COLUMN "public_id";
ALTER TABLE "users" DROP COLUMN "public_id";
-- +goose StatementEnd