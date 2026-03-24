-- name: ListWorkspacesByUserId :many
SELECT *
FROM workspaces
WHERE "owner_id" = $1
    AND (sqlc.narg(CURSOR)::uuid IS NULL
        OR iid < sqlc.narg(CURSOR)::uuid)
ORDER BY "iid" DESC
LIMIT $2;

-- name: CreateWorkspace :one
INSERT INTO workspaces("name", "owner_id")
    VALUES ($1, $2)
RETURNING *;

-- name: GetWorkspaceByIidAndUser :one
SELECT *
FROM workspaces
WHERE "iid" = $1
    AND "owner_id" = $2;

-- name: DeleteWorkspaceByIidAndUser :exec
DELETE FROM workspaces
WHERE "iid" = $1
    AND "owner_id" = $2;

-- name: UpdateWorkspaceByIidAndUser :one
UPDATE
    workspaces
SET "name" = COALESCE(sqlc.narg('name'), "name")
WHERE "iid" = $1
    AND "owner_id" = $2
RETURNING *;

