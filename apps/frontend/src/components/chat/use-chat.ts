import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat, type ChatStreamEvent } from "@/lib/chat-transport";
import { chatGetChatHistory } from "@/api/chat/chat";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface UseChatOptions {
  /** Current user's Base58 ID (from AuthMeResponse). */
  userId: string;
  /** Workspace Base58 ID for context-scoped chat. */
  workspaceId: string;
  /** Optional course Base58 ID for course-scoped retrieval. */
  courseId?: string;
  /** Optional note Base58 ID for note-first retrieval. */
  notesId?: string;
  /** Optional response style hint for the LLM. */
  answerStyle?: "auto" | "concise" | "direct" | "tutor";
  /** Called after a new chat message is sent and streaming finishes. */
  onChatCreated?: () => void;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  /** The active chat session ID (Base58), set when loading history. */
  activeChatId: string | null;
  /** Set the active chat ID externally (e.g. after refetching chat list). */
  setActiveChatId: (id: string | null) => void;
  sendMessage: (text: string) => void;
  clearMessages: () => void;
  /** Load a previous chat by its ID from the history API. */
  loadChat: (chatId: string) => Promise<void>;
}

/**
 * Hook encapsulating chat state, SSE streaming, and message management.
 *
 * Each call to `sendMessage` generates a fresh UUIDv7-compatible chat ID,
 * appends the user message optimistically, then streams the assistant reply.
 *
 * `loadChat(chatId)` fetches the history for a previous conversation and
 * restores it into the local message list so the user can continue chatting.
 */
export function useChat({
  userId,
  workspaceId,
  courseId,
  notesId,
  answerStyle,
  onChatCreated,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    setMessages([]);
    setError(null);
    setIsLoading(false);
    setActiveChatId(null);
    abortRef.current = true;
  }, [courseId, notesId, workspaceId]);

  const handleStreamEvent = useCallback((event: ChatStreamEvent, assistantId: string) => {
    switch (event.type) {
      case "text-delta":
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + event.delta } : m)),
        );
        break;
      case "error":
        setError(event.message);
        break;
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setError(null);
      setIsLoading(true);
      abortRef.current = false;

      // Optimistic user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };

      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      try {
        const chatId = crypto.randomUUID();
        const stream = streamChat(workspaceId, {
          id: chatId,
          user_id: userId,
          message: trimmed,
          ...(courseId ? { course_id: courseId } : {}),
          ...(notesId ? { notes_id: notesId } : {}),
          ...(answerStyle ? { answer_style: answerStyle } : {}),
        });

        for await (const event of stream) {
          if (abortRef.current) break;
          handleStreamEvent(event, assistantId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        // Remove the empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content !== ""));
      } finally {
        // Mark streaming complete
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
        );
        setIsLoading(false);
        onChatCreated?.();
      }
    },
    [answerStyle, courseId, handleStreamEvent, isLoading, notesId, onChatCreated, userId, workspaceId],
  );

  const loadChat = useCallback(
    async (chatId: string) => {
      setError(null);
      setIsLoading(true);
      abortRef.current = true; // cancel any running stream

      try {
        const response = await chatGetChatHistory(chatId);

        if (response.status !== 200) {
          setError("Failed to load chat history");
          setIsLoading(false);
          return;
        }

        const history = response.data;
        const restored: ChatMessage[] = history.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.text,
        }));

        setMessages(restored);
        setActiveChatId(chatId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load history";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setActiveChatId(null);
    abortRef.current = true;
  }, []);

  return { messages, isLoading, error, activeChatId, setActiveChatId, sendMessage, clearMessages, loadChat };
}
