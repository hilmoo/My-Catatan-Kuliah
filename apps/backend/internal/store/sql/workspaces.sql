-- name: GetWorkspace :one
SELECT * FROM workspaces
WHERE id = $1 LIMIT 1;

-- name: ListWorkspaces :many
SELECT * FROM workspaces
WHERE (sqlc.narg('owner_id')::int IS NULL OR owner_id = sqlc.narg('owner_id')::int)
ORDER BY id
LIMIT $1 OFFSET $2;

-- name: CreateWorkspace :one
INSERT INTO workspaces (
    name, owner_id
) VALUES (
    $1, $2
)
RETURNING *;

-- name: UpdateWorkspace :one
UPDATE workspaces
SET 
    name = COALESCE(sqlc.narg('name')::text, name)
WHERE id = $1
RETURNING *;

-- name: DeleteWorkspace :exec
DELETE FROM workspaces
WHERE id = $1;