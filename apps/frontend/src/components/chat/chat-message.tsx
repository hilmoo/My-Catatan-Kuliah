import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BotIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, JSX } from "react";
import type { ChatMessage as ChatMessageType } from "./use-chat";

interface ChatMessageProps {
  message: ChatMessageType;
}

type MarkdownElementProps<T extends keyof JSX.IntrinsicElements> =
  ComponentPropsWithoutRef<T> & {
    node?: unknown;
  };

const markdownComponents = {
  h1: ({ node: _node, className, ...props }: MarkdownElementProps<"h1">) => (
    <h1 className={cn("mb-3 mt-1 text-lg font-semibold leading-7", className)} {...props} />
  ),
  h2: ({ node: _node, className, ...props }: MarkdownElementProps<"h2">) => (
    <h2 className={cn("mb-2.5 mt-5 text-base font-semibold leading-7", className)} {...props} />
  ),
  h3: ({ node: _node, className, ...props }: MarkdownElementProps<"h3">) => (
    <h3 className={cn("mb-2 mt-4 text-sm font-semibold leading-6", className)} {...props} />
  ),
  p: ({ node: _node, className, ...props }: MarkdownElementProps<"p">) => (
    <p className={cn("my-2 leading-7 first:mt-0 last:mb-0", className)} {...props} />
  ),
  ul: ({ node: _node, className, ...props }: MarkdownElementProps<"ul">) => (
    <ul className={cn("my-3 list-disc space-y-1.5 pl-5", className)} {...props} />
  ),
  ol: ({ node: _node, className, ...props }: MarkdownElementProps<"ol">) => (
    <ol className={cn("my-3 list-decimal space-y-1.5 pl-5", className)} {...props} />
  ),
  li: ({ node: _node, className, ...props }: MarkdownElementProps<"li">) => (
    <li className={cn("pl-1 leading-7", className)} {...props} />
  ),
  table: ({ node: _node, className, ...props }: MarkdownElementProps<"table">) => (
    <div className="my-4 max-w-full overflow-x-auto rounded-lg border border-border/70">
      <table
        className={cn("w-full min-w-[640px] border-collapse text-left text-xs", className)}
        {...props}
      />
    </div>
  ),
  thead: ({ node: _node, className, ...props }: MarkdownElementProps<"thead">) => (
    <thead className={cn("bg-muted/70", className)} {...props} />
  ),
  th: ({ node: _node, className, ...props }: MarkdownElementProps<"th">) => (
    <th
      className={cn(
        "border-b border-r border-border/70 px-3 py-2 align-top font-semibold leading-5 last:border-r-0",
        className,
      )}
      {...props}
    />
  ),
  td: ({ node: _node, className, ...props }: MarkdownElementProps<"td">) => (
    <td
      className={cn(
        "border-b border-r border-border/50 px-3 py-2.5 align-top leading-6 last:border-r-0",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ node: _node, className, ...props }: MarkdownElementProps<"hr">) => (
    <hr className={cn("my-5 border-border/70", className)} {...props} />
  ),
};

function normalizeAssistantMarkdown(content: string) {
  return content
    .split("\n")
    .map((line) => {
      const replacement = line.includes("|") ? " / " : "\n";
      return line.replace(/<br\s*\/?>/gi, replacement);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const assistantContent = isUser ? message.content : normalizeAssistantMarkdown(message.content);

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {isUser ? <UserIcon className="size-4" /> : <BotIcon className="size-4" />}
      </div>

      <div
        className={cn(
          "min-w-0 max-w-full text-sm",
          isUser
            ? "max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 leading-relaxed text-primary-foreground"
            : "w-full rounded-xl border border-border/70 bg-card/80 px-5 py-4 text-foreground shadow-sm",
        )}
      >
        {message.content ? (
          isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div
              className="prose prose-sm prose-invert max-w-none
                prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground
                prose-li:text-foreground prose-th:text-foreground prose-td:text-foreground
                prose-code:rounded prose-code:bg-black/20 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
                prose-pre:my-2 prose-pre:rounded-lg prose-pre:bg-black/20 prose-pre:p-3
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
            >
              <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {assistantContent}
              </Markdown>
            </div>
          )
        ) : (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse" style={{ animationDelay: "150ms" }}>
              ●
            </span>
            <span className="animate-pulse" style={{ animationDelay: "300ms" }}>
              ●
            </span>
          </span>
        )}
        {message.isStreaming && message.content && (
          <span className="ml-0.5 inline-block animate-pulse">▎</span>
        )}
      </div>
    </div>
  );
}
