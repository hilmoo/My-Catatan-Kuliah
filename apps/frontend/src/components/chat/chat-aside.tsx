import { useEffect, useRef, useState } from "react";
import { MessageSquareIcon, SendIcon, SparklesIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChatMessage } from "./chat-message";
import { useChat } from "./use-chat";

interface ChatAsideProps {
  workspaceId: string;
  userId: string;
}

export function ChatAside({ workspaceId, userId }: ChatAsideProps) {
  const [open, setOpen] = useState(false);
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat({
    userId,
    workspaceId,
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  if (!open) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-6 right-6 z-50 size-12 rounded-full shadow-lg"
            onClick={() => setOpen(true)}
          >
            <MessageSquareIcon className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Ask AI</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <aside className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-primary" />
          <span className="text-sm font-semibold">AI Chat</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="size-7" onClick={clearMessages}>
              <Trash2Icon className="size-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setOpen(false)}>
            <XIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <SparklesIcon className="size-8 text-primary/40" />
            <p className="text-xs text-muted-foreground">
              Ask anything about your course material.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mb-2 rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a question..."
            disabled={isLoading}
            className="flex-1 text-sm"
          />
          <Button type="submit" size="icon" className="size-9" disabled={isLoading || !input.trim()}>
            <SendIcon className="size-3.5" />
          </Button>
        </div>
      </form>
    </aside>
  );
}
