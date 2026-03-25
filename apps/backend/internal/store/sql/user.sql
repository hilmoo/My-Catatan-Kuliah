-- name: GetuserIidById :one
SELECT iid
FROM users
WHERE "id" = $1;

-- name: GetuserById :one
SELECT *
FROM users
WHERE "id" = $1;

-- name: UpdateOrCreateUser :one
INSERT INTO users(email, name, avatar_url, provider, provider_id)
    VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (email)
    DO UPDATE SET
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        provider = EXCLUDED.provider,
        provider_id = EXCLUDED.provider_id
    RETURNING *;

