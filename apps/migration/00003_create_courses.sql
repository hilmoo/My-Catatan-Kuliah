-- +goose Up
-- +goose StatementBegin
CREATE TYPE day_of_week AS ENUM (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
    );

CREATE TABLE "courses"
(
    "id"            integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "name"          text        NOT NULL,
    "lecturer_name" text,
    "day"           day_of_week NOT NULL,
    "start_time"    time        NOT NULL,
    "end_time"      time        NOT NULL,
    "workspace_id"  integer     NOT NULL,
    CONSTRAINT chk_course_time CHECK (end_time > start_time)
);

ALTER TABLE "courses"
    ADD FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id");
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE "courses";
DROP TYPE day_of_week;
-- +goose StatementEnd
