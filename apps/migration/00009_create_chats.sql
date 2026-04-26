-- +goose Up
-- +goose StatementBegin
CREATE TABLE "llm_chats" (
    "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "iid" uuid DEFAULT uuidv7() NOT NULL UNIQUE,
    "user_id" integer NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "workspace_id" integer NOT NULL REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    "title" text NOT NULL DEFAULT 'Untitled Chat',
    "active_stream_id" text,
    "created_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX "llm_chats_user_id_idx" ON "llm_chats" ("user_id");  
CREATE INDEX "llm_chats_workspace_id_idx" ON "llm_chats" ("workspace_id");  

CREATE TABLE "llm_chat_messages" (
    "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "llm_chats_id" bigint NOT NULL,
    "role" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("llm_chats_id") REFERENCES "llm_chats"("id") ON DELETE CASCADE
);

CREATE TABLE "llm_chat_message_parts" (
    "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "llm_chat_messages_id" bigint NOT NULL,
    "text" text,
    FOREIGN KEY ("llm_chat_messages_id") REFERENCES "llm_chat_messages"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_llm_chat_messages_llm_chats_id"  
    ON "llm_chat_messages" ("llm_chats_id");  

CREATE INDEX "idx_llm_chat_message_parts_llm_chat_messages_id"  
    ON "llm_chat_message_parts" ("llm_chat_messages_id");  

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS "llm_chat_message_parts";

DROP TABLE IF EXISTS "llm_chat_messages";

DROP TABLE IF EXISTS "llm_chats";

-- +goose StatementEnd
