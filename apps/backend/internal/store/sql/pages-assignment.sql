-- name: ListAssignmentPagesByWorkspaceId :many
SELECT p.*,
    u.iid AS user_iid,
    pp.iid AS parent_iid,
    w.iid AS workspace_iid
FROM pages p
    JOIN users u ON p.created_by = u.id
    JOIN workspaces w ON p.workspace_id = w.id
    LEFT JOIN pages pp ON p.parent_id = pp.id
WHERE p."workspace_id" = $1
    AND p."type" = 'assignment'
    AND p."created_by" = $2
    AND (sqlc.narg(CURSOR)::uuid IS NULL
        OR p.iid < sqlc.narg(CURSOR)::uuid)
ORDER BY p.iid DESC
LIMIT $3;

-- name: GetAssignmentPageByIid :one
SELECT p.*,
    u.iid AS user_iid,
    pp.iid AS parent_iid,
    w.iid AS workspace_iid
FROM pages p
    JOIN users u ON p.created_by = u.id
    JOIN workspaces w ON p.workspace_id = w.id
    LEFT JOIN pages pp ON p.parent_id = pp.id
WHERE p.iid = $1
    AND p."type" = 'assignment'
    AND p."created_by" = $2;

-- name: CreateAssignmentPage :one
WITH inserted AS (
    INSERT INTO pages (
        "workspace_id", 
        "parent_id", 
        "title", 
        "icon", 
        "type", 
        "properties", 
        "created_by"
    )
    VALUES (
        (SELECT id FROM workspaces WHERE workspaces.iid = sqlc.arg('workspace_iid')),
        (SELECT id FROM pages WHERE pages.iid = sqlc.narg('parent_iid')),
        sqlc.arg('title'),
        sqlc.narg('icon'),
        'assignment'::page_type,
        sqlc.arg('properties'),
        sqlc.arg('created_by_id')
    )
    RETURNING *
)
SELECT 
    p.*,
    u.iid AS user_iid,
    pp.iid AS parent_iid,
    w.iid AS workspace_iid
FROM inserted p
    JOIN users u ON p.created_by = u.id
    JOIN workspaces w ON p.workspace_id = w.id
    LEFT JOIN pages pp ON p.parent_id = pp.id;

-- name: UpdateAssignmentPage :one
WITH updated AS (
    UPDATE pages
    SET title = COALESCE(sqlc.narg('title')::text, title),
        parent_id = COALESCE((SELECT id FROM pages WHERE pages.iid = sqlc.narg('parent_iid')), parent_id),
        icon = COALESCE(sqlc.narg('icon')::text, icon),
        properties = COALESCE(sqlc.narg('properties')::jsonb, properties),
        updated_at = NOW()
    WHERE pages.iid = sqlc.arg('iid')
        AND pages.type = 'assignment'::page_type
        AND pages.created_by = sqlc.arg('created_by')
    RETURNING id, iid, workspace_id, parent_id, title, icon, type, properties, created_by, created_at, updated_at
)
SELECT 
    p.*,
    p.updated_at,
    u.iid AS user_iid,
    pp.iid AS parent_iid,
    w.iid AS workspace_iid
FROM updated p
JOIN users u ON p.created_by = u.id
JOIN workspaces w ON p.workspace_id = w.id
LEFT JOIN pages pp ON p.parent_id = pp.id;

-- name: DeleteAssignmentPage :exec
DELETE FROM pages
WHERE "iid" = $1
    AND "created_by" = $2
    AND "type" = 'assignment';

