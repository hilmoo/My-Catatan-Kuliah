-- name: GetCourseNote :one
SELECT * FROM course_notes
WHERE id = $1 LIMIT 1;

-- name: ListCourseNotes :many
SELECT * FROM course_notes
WHERE (sqlc.narg('course_id')::int IS NULL OR course_id = sqlc.narg('course_id')::int)
  AND (sqlc.narg('created_by')::int IS NULL OR created_by = sqlc.narg('created_by')::int)
ORDER BY id
LIMIT $1 OFFSET $2;

-- name: CreateCourseNote :one
INSERT INTO course_notes (
    title, content, course_id, created_by
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: UpdateCourseNote :one
UPDATE course_notes
SET 
    title = COALESCE(sqlc.narg('title')::text, title),
    content = COALESCE(sqlc.narg('content')::text, content),
    content_blob = COALESCE(sqlc.narg('content_blob')::bytea, content_blob)
WHERE id = $1
RETURNING *;

-- name: DeleteCourseNote :exec
DELETE FROM course_notes
WHERE id = $1;