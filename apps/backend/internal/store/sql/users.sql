-- name: GetUser :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 LIMIT 1;

-- name: ListUsers :many
SELECT * FROM users
ORDER BY id
LIMIT $1 OFFSET $2;

-- name: CreateUser :one
INSERT INTO users (
    username, email, password
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: UpdateUser :one
UPDATE users
SET 
    username = COALESCE(sqlc.narg('username')::text, username),
    email = COALESCE(sqlc.narg('email')::text, email),
    password = COALESCE(sqlc.narg('password')::text, password)
WHERE id = $1
RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;