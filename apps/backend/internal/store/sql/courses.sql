-- name: GetCourse :one
SELECT * FROM courses
WHERE id = $1 LIMIT 1;

-- name: ListCourses :many
SELECT * FROM courses
WHERE (sqlc.narg('workspace_id')::int IS NULL OR workspace_id = sqlc.narg('workspace_id')::int)
ORDER BY id
LIMIT $1 OFFSET $2;

-- name: CreateCourse :one
INSERT INTO courses (
    name, lecturer_name, day, start_time, end_time, workspace_id
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: UpdateCourse :one
UPDATE courses
SET 
    name = COALESCE(sqlc.narg('name')::text, name),
    lecturer_name = COALESCE(sqlc.narg('lecturer_name')::text, lecturer_name),
    day = COALESCE(sqlc.narg('day')::day_of_week, day),
    start_time = COALESCE(sqlc.narg('start_time')::time, start_time),
    end_time = COALESCE(sqlc.narg('end_time')::time, end_time)
WHERE id = $1
RETURNING *;

-- name: DeleteCourse :exec
DELETE FROM courses
WHERE id = $1;