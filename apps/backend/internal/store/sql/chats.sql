-- name: ValidateChatOwnership :one
SELECT EXISTS (
    SELECT 1
    FROM llm_chats
    WHERE "iid" = $1
        AND "user_id" = $2
);

-- name: ListChatsByWorkspaceID :many
SELECT * FROM llm_chats
WHERE workspace_id = (SELECT id FROM workspaces WHERE workspaces.iid = $1 AND workspaces.owner_id = $2)
AND user_id = $2
ORDER BY created_at DESC;

-- name: GetChatHistory :many
SELECT 
    m.id,
    m.role,
    m.created_at,
    COALESCE(STRING_AGG(p.text, '' ORDER BY p.id), '')::text AS text
FROM llm_chat_messages m
LEFT JOIN llm_chat_message_parts p ON m.id = p.llm_chat_messages_id
WHERE m.llm_chats_id = (SELECT id FROM llm_chats WHERE llm_chats.iid = $1 AND llm_chats.user_id = $2)
GROUP BY m.id
ORDER BY m.created_at ASC;

-- name: UpdateChatTitle :exec
UPDATE llm_chats
SET title = $1
WHERE iid = $2 AND user_id = $3;