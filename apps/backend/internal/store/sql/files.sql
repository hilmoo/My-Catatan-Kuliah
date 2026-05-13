-- name: GetFileByID :one
SELECT id, s3_key, mime_type, size, created_by, created_at, width, height
FROM files
WHERE id = $1 AND created_by = $2;

-- name: CreateFile :one
INSERT INTO files (s3_key, mime_type, size, created_by, width, height)
VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;

-- name: DeleteFileByID :exec
DELETE FROM files
WHERE id = $1 AND created_by = $2;

-- name: GetS3KeyByID :one
SELECT s3_key
FROM files
WHERE id = $1 AND created_by = $2;