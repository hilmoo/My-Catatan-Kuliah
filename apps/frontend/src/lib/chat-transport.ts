/**
 * SSE transport for the AI chat service.
 *
 * Connects to the Python AI backend which implements the
 * AI SDK Data Stream Protocol (start → text-delta* → finish → [DONE]).
 */

/** Event types emitted by the AI service SSE stream. */
export type ChatStreamEvent =
  | { type: "start"; messageId: string }
  | { type: "text-start"; id: string }
  | { type: "text-delta"; id: string; delta: string }
  | { type: "text-end"; id: string }
  | { type: "finish"; messageMetadata?: Record<string, unknown> }
  | { type: "error"; message: string }
  | { type: "done" };

export interface ChatRequestPayload {
  id: string;
  user_id: string;
  message: string;
  workspace_id: string;
  course_id?: string;
  notes_id?: string;
  answer_style?: "auto" | "concise" | "direct" | "tutor";
}

/**
 * Send a chat message and yield parsed SSE events as they arrive.
 *
 * Uses a standard `fetch` with streaming body parsing —
 * no external dependencies required.
 */
export async function* streamChat(
  payload: ChatRequestPayload,
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!response.ok) {
    yield { type: "error", message: `HTTP ${response.status}: ${response.statusText}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: "error", message: "Response body is not readable" };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6); // Remove "data: " prefix

        if (data === "[DONE]") {
          yield { type: "done" };
          return;
        }

        try {
          const event = JSON.parse(data) as ChatStreamEvent;
          yield event;
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Resume a previously started stream by its chat ID.
 * Returns null if no active stream exists (204 response).
 */
export async function* resumeStream(
  chatId: string,
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch(`/chat/${chatId}/stream`, {
    credentials: "include",
  });

  if (response.status === 204) return;

  if (!response.ok) {
    yield { type: "error", message: `HTTP ${response.status}: ${response.statusText}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);

        if (data === "[DONE]") {
          yield { type: "done" };
          return;
        }

        try {
          yield JSON.parse(data) as ChatStreamEvent;
        } catch {
          // Skip malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
