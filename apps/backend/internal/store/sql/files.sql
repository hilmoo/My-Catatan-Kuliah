-- name: GetFileByID :one
SELECT *
FROM files
WHERE id = $1 AND created_by = $2;

-- name: CreateFile :one
INSERT INTO files (s3_key, mime_type, size, created_by)
VALUES ($1, $2, $3, $4) RETURNING id;

-- name: DeleteFileByID :exec
DELETE FROM files
WHERE id = $1 AND created_by = $2;

-- name: GetS3KeyByID :one
SELECT s3_key
FROM files
WHERE id = $1 AND created_by = $2;