import "@typespec/http";

using TypeSpec.Http;
namespace Chats;

model ChatSummary {
    id: string;
    title: string;
    created_at: string;
}

model ChatListResponse is Array<ChatSummary>;

model ChatMessage {
    id: string;
    role: string;
    text: string;
    created_at: string;
}

model ChatHistoryResponse is Array<ChatMessage>;

model UpdateChatTitleRequest {
    title: string;
}

model UpdateChatTitleResponse {
    title: string;
}
