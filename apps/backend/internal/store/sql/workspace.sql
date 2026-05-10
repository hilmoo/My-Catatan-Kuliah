-- name: GetWorkspaceIdByIidAndUser :one
SELECT id
FROM workspaces
WHERE iid = $1
    AND owner_id = $2;

-- name: ListWorkspacesByUserId :many
SELECT *
FROM workspaces
WHERE "owner_id" = $1
ORDER BY "iid" DESC;

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

-- name: ValidateWorkspaceOwnership :one
SELECT EXISTS (
    SELECT 1
    FROM workspaces
    WHERE "iid" = $1
        AND "owner_id" = $2
);