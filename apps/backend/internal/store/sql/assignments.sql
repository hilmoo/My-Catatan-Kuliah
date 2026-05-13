-- name: ListAssignmentsByUserId :many
SELECT 
    assignments.*, 
    courses.iid AS course_iid
FROM assignments
JOIN courses ON assignments.course_id = courses.id
WHERE assignments.created_by = $1
AND assignments.course_id = (SELECT id FROM courses WHERE courses.iid = sqlc.arg('courseIid'))
ORDER BY 
    assignments.status ASC,
    assignments.position ASC;

-- name: CreateAssignment :one
INSERT INTO assignments("course_id", "title", "content", "status", "position", "due_date", "created_by", "color")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetAssignmentByIidAndUser :one
SELECT 
    assignments.*, 
    courses.iid AS course_iid
FROM assignments
JOIN courses ON assignments.course_id = courses.id
WHERE assignments.iid = $1
    AND assignments.created_by = $2;

-- name: DeleteAssignmentByIidAndUser :exec
DELETE FROM assignments
WHERE "iid" = $1
    AND "created_by" = $2;

-- name: UpdateAssignmentByIidAndUser :one
UPDATE assignments a
SET 
    "title" = COALESCE(sqlc.narg('title'), a."title"),
    "content" = COALESCE(sqlc.narg('content'), a."content"),
    "status" = COALESCE(sqlc.narg('status'), a."status"),
    "position" = COALESCE(sqlc.narg('position'), a."position"),
    "due_date" = COALESCE(sqlc.narg('due_date'), a."due_date"),
    "color" = COALESCE(sqlc.narg('color'), a."color"),
    "updated_at" = NOW()
FROM courses c
WHERE a."course_id" = c."id"
    AND a."iid" = $1
    AND a."created_by" = $2
RETURNING 
    a.*, 
    c.iid AS course_iid;

-- name: ValidateAssignmentAccess :one
SELECT EXISTS (
    SELECT 1
    FROM assignments
    JOIN courses ON assignments.course_id = courses.id
    WHERE assignments.iid = $1
        AND assignments.created_by = $2
);