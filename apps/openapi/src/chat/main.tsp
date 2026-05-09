import "@typespec/http";

import "../common/error.tsp";
import "../common/response.tsp";
import "./index.tsp";

using TypeSpec.Http;

namespace MyCatatanServices;

@route("/api/chat")
@tag("Chat")
interface Chat {
    @route("/{workspaceId}")
    @doc("Send a message to the chat associated with the specified workspace.")
    @post
    sendMessage(
        @doc("The unique identifier of the workspace")
        @path
        workspaceId: string,
    ): void;

    @route("/{chatId}/stream")
    @doc("Stream chat messages in real-time for the specified chat session.")
    @get
    streamMessages(
        @doc("The unique identifier of the chat session")
        @path
        chatId: string,
    ): void;

    @route("/workspace/{workspaceId}")
    @doc("List all chats in a workspace.")
    @get
    listChats(
        @path workspaceId: string
    ): Chats.ChatListResponse | CommonError.GetCommonErrorAuth;

    @route("/{chatId}/history")
    @doc("Get chat history for a specific s")
    @get
    getChatHistory(
        @path chatId: string
    ): Chats.ChatHistoryResponse | CommonError.GetCommonErrorAuth;

    @route("/{chatId}/title")
    @doc("Update the title of a chat session.")
    @patch
    updateChatTitle(
        @path chatId: string,
        @body body: Chats.UpdateChatTitleRequest
    ): Chats.UpdateChatTitleResponse | CommonError.GetCommonErrorAuth;
}
