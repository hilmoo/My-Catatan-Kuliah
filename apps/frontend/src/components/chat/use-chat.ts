import { useCallback, useRef, useState } from "react";
import { streamChat, type ChatStreamEvent } from "@/lib/chat-transport";

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
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string) => void;
  clearMessages: () => void;
}

/**
 * Hook encapsulating chat state, SSE streaming, and message management.
 *
 * Each call to `sendMessage` generates a fresh UUIDv7-compatible chat ID,
 * appends the user message optimistically, then streams the assistant reply.
 */
export function useChat({ userId, workspaceId }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

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
        const stream = streamChat({
          id: chatId,
          user_id: userId,
          message: trimmed,
          workspace_id: workspaceId,
        });

        for await (const event of stream) {
          if (abortRef.current) break;
          handleStreamEvent(event, assistantId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Terjadi kesalahan";
        setError(message);
        // Remove the empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content !== ""));
      } finally {
        // Mark streaming complete
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
        );
        setIsLoading(false);
      }
    },
    [isLoading, userId, workspaceId],
  );

  const handleStreamEvent = useCallback(
    (event: ChatStreamEvent, assistantId: string) => {
      switch (event.type) {
        case "text-delta":
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + event.delta } : m,
            ),
          );
          break;
        case "error":
          setError(event.message);
          break;
      }
    },
    [],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    abortRef.current = true;
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
