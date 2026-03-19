-- name: GetAssignment :one
SELECT * FROM assignments
WHERE id = $1 LIMIT 1;

-- name: ListAssignments :many
SELECT * FROM assignments
WHERE (sqlc.narg('course_id')::int IS NULL OR course_id = sqlc.narg('course_id')::int)
  AND (sqlc.narg('status')::assignment_status IS NULL OR status = sqlc.narg('status')::assignment_status)
ORDER BY id
LIMIT $1 OFFSET $2;

-- name: CreateAssignment :one
INSERT INTO assignments (
    title, description, deadline, status, course_id, created_by
) VALUES (
    $1, $2, $3, COALESCE(sqlc.narg('status')::assignment_status, 'pending'::assignment_status), $4, $5
)
RETURNING *;

-- name: UpdateAssignment :one
UPDATE assignments
SET 
    title = COALESCE(sqlc.narg('title')::text, title),
    description = COALESCE(sqlc.narg('description')::text, description),
    deadline = COALESCE(sqlc.narg('deadline')::timestamp, deadline),
    status = COALESCE(sqlc.narg('status')::assignment_status, status)
WHERE id = $1
RETURNING *;

-- name: DeleteAssignment :exec
DELETE FROM assignments
WHERE id = $1;