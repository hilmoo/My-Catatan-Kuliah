-- name: ListCoursesByUserId :many
SELECT 
courses.*,
workspaces.iid AS workspace_iid
FROM courses
JOIN workspaces ON courses.workspace_id = workspaces.id
WHERE courses.created_by = $1
ORDER BY courses.created_at DESC;

-- name: CreateCourse :one
INSERT INTO courses("workspace_id", "title", "instructor", "credits", "created_by")
    VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetCourseByIidAndUser :one
SELECT 
courses.*,
workspaces.iid AS workspace_iid
FROM courses
JOIN workspaces ON courses.workspace_id = workspaces.id
WHERE courses.iid = $1
    AND courses.created_by = $2;

-- name: DeleteCourseByIidAndUser :exec
DELETE FROM courses
WHERE "iid" = $1
    AND "created_by" = $2;

-- name: UpdateCourseByIidAndUser :one
UPDATE courses c
SET 
    "title" = COALESCE(sqlc.narg('title'), c."title"),
    "instructor" = COALESCE(sqlc.narg('instructor'), c."instructor"),
    "credits" = COALESCE(sqlc.narg('credits'), c."credits"),
    "updated_at" = NOW()
FROM workspaces w
WHERE c."workspace_id" = w."id"
    AND c."iid" = $1
    AND c."created_by" = $2
RETURNING 
    c.*,
    w.iid AS workspace_iid;

-- name: GetCourseByIid :one
SELECT *
FROM courses
WHERE "iid" = $1;