-- name: GetPageAssignmentParentIdByIidAndUser :one
SELECT parent_id
FROM pages
WHERE iid = $1
    AND "type" = 'course'
    AND "created_by" = $2;

-- name: GetPageFolderParentIdByIidAndUser :one
SELECT parent_id
FROM pages
WHERE iid = $1
    AND "type" = 'folder'
    AND "created_by" = $2;

-- name: GetPageNoteParentIdByIidAndUser :one
SELECT parent_id
FROM pages
WHERE iid = $1
    AND "type" IN ('folder', 'course', 'note')
    AND "created_by" = $2;

-- name: GetPageCourseParentIdByIidAndUser :one
SELECT parent_id
FROM pages
WHERE iid = $1
    AND "type" = 'folder'
    AND "created_by" = $2;

-- name: GetPageTypesByIidAndUser :one
SELECT type
FROM pages
WHERE iid = $1
    AND "created_by" = $2;

-- name: ListPagesByWorkspaceIdAndType :many
SELECT p.*,
    u.iid AS user_iid,
    pp.iid AS parent_iid,
    w.iid AS workspace_iid
FROM pages p
    JOIN users u ON p.created_by = u.id
    JOIN workspaces w ON p.workspace_id = w.id
    LEFT JOIN pages pp ON p.parent_id = pp.id
WHERE p."workspace_id" = $1
    AND p."type" = $2
    AND p."created_by" = $3
    AND (sqlc.narg(CURSOR)::uuid IS NULL
        OR p.iid < sqlc.narg(CURSOR)::uuid)
ORDER BY p.iid DESC
LIMIT $4;

-- name: GetPageByIid :one
SELECT p.*,
    u.iid AS user_iid,
    pp.iid AS parent_iid,
    w.iid AS workspace_iid
FROM pages p
    JOIN users u ON p.created_by = u.id
    JOIN workspaces w ON p.workspace_id = w.id
    LEFT JOIN pages pp ON p.parent_id = pp.id
WHERE p.iid = $1
    AND p."created_by" = $2;

-- name: CreatePage :one
WITH inserted AS (
INSERT INTO pages("workspace_id", "parent_id", "title", "icon", "type", "properties", "created_by")
        VALUES (sqlc.arg('workspace_id'), sqlc.arg('parent_id'), sqlc.arg('title'), sqlc.narg('icon'), sqlc.arg('type'), sqlc.arg('properties'), sqlc.arg('created_by_id'))
    RETURNING *)
    SELECT p.*,
        u.iid AS user_iid,
        pp.iid AS parent_iid,
        w.iid AS workspace_iid
    FROM inserted p
        JOIN users u ON p.created_by = u.id
        JOIN workspaces w ON p.workspace_id = w.id
        LEFT JOIN pages pp ON p.parent_id = pp.id;

-- name: UpdatePage :one
WITH updated AS (
    UPDATE
        pages
    SET title = COALESCE(sqlc.narg('title')::text, title),
        parent_id = COALESCE(sqlc.narg('parent_id')::integer, parent_id),
        icon = COALESCE(sqlc.narg('icon')::text, icon),
        properties = COALESCE(sqlc.narg('properties')::jsonb, properties),
        updated_at = NOW()
    WHERE pages.iid = sqlc.arg('iid')
        AND pages.created_by = sqlc.arg('created_by')
    RETURNING id,
        iid,
        workspace_id,
        parent_id,
        title,
        icon,
        type,
        properties,
        created_by,
        created_at,
        updated_at
)
SELECT p.*,
    p.updated_at,
    u.iid AS user_iid,
    pp.iid AS parent_iid,
    w.iid AS workspace_iid
FROM updated p
    JOIN users u ON p.created_by = u.id
    JOIN workspaces w ON p.workspace_id = w.id
    LEFT JOIN pages pp ON p.parent_id = pp.id;

-- name: DeletePage :exec
DELETE FROM pages
WHERE "iid" = $1
    AND "created_by" = $2;

