-- name: ListNotesByUserId :many
SELECT 
notes.*,
courses.iid AS course_iid
FROM notes
JOIN courses ON notes.course_id = courses.id
WHERE notes.created_by = $1
AND notes.course_id = (SELECT id FROM courses WHERE courses.iid = sqlc.arg('courseIid'))
ORDER BY notes.position ASC;

-- name: CreateNote :one
INSERT INTO notes("course_id", "title", "content", "created_by", "position", "color")
    VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetNoteByIidAndUser :one
SELECT 
notes.*,
courses.iid AS course_iid
FROM notes
JOIN courses ON notes.course_id = courses.id
WHERE notes.iid = $1
    AND notes.created_by = $2;

-- name: DeleteNoteByIidAndUser :exec
DELETE FROM notes
WHERE "iid" = $1
    AND "created_by" = $2;

-- name: UpdateNoteByIidAndUser :one
UPDATE notes n
SET 
    "title" = COALESCE(sqlc.narg('title'), n."title"),
    "content" = COALESCE(sqlc.narg('content'), n."content"),
    "position" = COALESCE(sqlc.narg('position'), n."position"),
    "color" = COALESCE(sqlc.narg('color'), n."color"),
    "updated_at" = NOW()
FROM courses c
WHERE n."course_id" = c."id"
    AND n."iid" = $1
    AND n."created_by" = $2
RETURNING 
    n.*, 
    c.iid AS course_iid;

-- name: ValidateNoteAccess :one
SELECT EXISTS (
    SELECT 1
    FROM notes
    JOIN courses ON notes.course_id = courses.id    
    WHERE notes.iid = $1
        AND notes.created_by = $2
);