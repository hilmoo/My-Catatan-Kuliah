import { useEffect, useRef, useState } from "react";
import {
  BookOpenIcon,
  ChevronDownIcon,
  GraduationCapIcon,
  MessageSquareIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChatMessage } from "./chat-message";
import { useChat } from "./use-chat";

type AnswerStyle = "auto" | "concise" | "direct" | "tutor";

const ANSWER_STYLES: Record<AnswerStyle, string> = {
  auto: "Auto",
  concise: "Concise",
  direct: "Direct",
  tutor: "Tutor",
};

interface ChatAsideProps {
  workspaceId: string;
  userId: string;
  courseId?: string;
  notesId?: string;
}

export function ChatAside({ workspaceId, userId, courseId, notesId }: ChatAsideProps) {
  const [open, setOpen] = useState(false);
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>("auto");
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat({
    userId,
    workspaceId,
    courseId,
    notesId,
    answerStyle,
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const contextLabel = notesId ? "Note context" : courseId ? "Course context" : "Workspace context";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
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
    <aside className="fixed bottom-6 right-6 z-50 flex h-[min(620px,calc(100vh-3rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-card/95 shadow-2xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" />
            <span className="text-sm font-semibold">AI Chat</span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-muted-foreground">{contextLabel}</div>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                {ANSWER_STYLES[answerStyle]}
                <ChevronDownIcon className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {Object.entries(ANSWER_STYLES).map(([value, label]) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => setAnswerStyle(value as AnswerStyle)}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full border bg-background">
              {notesId ? (
                <BookOpenIcon className="size-5 text-muted-foreground" />
              ) : (
                <GraduationCapIcon className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Ask about your material</p>
              <p className="mx-auto max-w-64 text-xs leading-5 text-muted-foreground">
                I will prioritize the current {notesId ? "note" : "course"} and fall back to the
                workspace when needed.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {["Summarize this", "Explain simply", "Make quiz"].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
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
        <div className="flex min-h-11 items-end gap-2 rounded-xl border bg-background px-3 py-2 focus-within:border-primary/50">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a question..."
            disabled={isLoading}
            rows={1}
            className="max-h-30 min-h-6 flex-1 resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-muted-foreground/70 disabled:opacity-50"
          />
          <Button
            type="submit"
            size="icon"
            className="size-8 shrink-0 rounded-lg"
            disabled={isLoading || !input.trim()}
          >
            <SendIcon className="size-3.5" />
          </Button>
        </div>
      </form>
    </aside>
  );
}
