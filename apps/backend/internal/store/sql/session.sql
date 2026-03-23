-- name: GetSessionByToken :one
SELECT *
FROM sessions
WHERE "hash_token" = $1
    AND "expires_at" > NOW();

-- name: CreateNewSession :exec
INSERT INTO sessions("user_id", "hash_token", "expires_at", "ip_address", "user_agent")
    VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: DeleteSessionByToken :exec
DELETE FROM sessions
WHERE "hash_token" = $1;

-- name: ListSessionsByUserId :many
SELECT *
FROM sessions
WHERE "user_id" = $1
  AND "expires_at" > NOW()
ORDER BY "created_at" DESC, "id" DESC
LIMIT $2 OFFSET $3;


-- name: GetSessionById :one
SELECT *
FROM sessions
WHERE "id" = $1
    AND "expires_at" > NOW() AND "user_id" = $2;

-- name: DeleteSessionById :exec
DELETE FROM sessions
WHERE "id" = $1 AND "user_id" = $2;