-- name: GetFileByID :one
SELECT *
FROM files
WHERE id = $1 AND created_by = $2;

-- name: CreateFile :exec
INSERT INTO files (s3_key, mime_type, size, created_by)
VALUES ($1, $2, $3, $4);

-- name: DeleteFileByID :one
DELETE FROM files
WHERE id = $1 AND created_by = $2
RETURNING s3_key;