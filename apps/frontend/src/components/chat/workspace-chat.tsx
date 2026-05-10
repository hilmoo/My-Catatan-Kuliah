import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  getCoursesServiceListCoursesQueryKey,
  useCoursesServiceCreateCourse,
  useCoursesServiceListCourses,
} from "@/api/courses/courses";
import { getNotesServiceListNotesQueryKey, useNotesServiceCreateNote } from "@/api/notes/notes";
import {
  chatListChats,
  getChatListChatsQueryKey,
  useChatListChats,
  useChatUpdateChatTitle,
} from "@/api/chat/chat";
import {
  BookOpenIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  HistoryIcon,
  LightbulbIcon,
  MessageSquareIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "./chat-message";
import { useChat } from "./use-chat";

interface WorkspaceChatProps {
  workspaceId: string;
  userId: string;
  userName: string;
}

type AnswerStyle = "auto" | "concise" | "direct" | "tutor";

const ANSWER_STYLES: Record<AnswerStyle, string> = {
  auto: "Auto",
  concise: "Concise",
  direct: "Direct",
  tutor: "Tutor",
};

const AI_SUGGESTIONS = [
  {
    icon: BookOpenIcon,
    label: "Summarize notes",
    prompt: "Summarize the latest notes in this workspace",
  },
  {
    icon: ClipboardListIcon,
    label: "Check assignments",
    prompt: "What assignments are not completed yet?",
  },
  {
    icon: LightbulbIcon,
    label: "Explain topic",
    prompt: "Explain the key concepts from the latest material",
  },
];

function getLandingGreeting(name: string) {
  const hour = new Date().getHours();
  const displayName = name || "there";
  const options =
    hour < 5
      ? [
          `Still awake, ${displayName}?`,
          `Night owl mode, ${displayName}`,
          `Late study session, ${displayName}?`,
        ]
      : hour < 11
        ? [
            `Morning, ${displayName}`,
            `Fresh start, ${displayName}?`,
            `Ready to learn, ${displayName}?`,
          ]
        : hour < 15
          ? [
              `Nice sunny day, ${displayName}?`,
              `Midday focus, ${displayName}`,
              `What are we learning, ${displayName}?`,
            ]
          : hour < 18
            ? [
                `Afternoon grind, ${displayName}?`,
                `Back to notes, ${displayName}?`,
                `Need a quick recap, ${displayName}?`,
              ]
            : hour < 22
              ? [
                  `Evening study, ${displayName}?`,
                  `Let's wrap this up, ${displayName}`,
                  `What needs untangling, ${displayName}?`,
                ]
              : [
                  `Get some sleep soon, ${displayName}`,
                  `Night owl mode, ${displayName}`,
                  `One last question, ${displayName}?`,
                ];

  return options[Math.floor(Math.random() * options.length)];
}

/** Relative time label, e.g. "2h ago", "Yesterday", "3 days ago" */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/** Generate a short title from the user's first message (first ~6 words, max 50 chars). */
function makeAutoTitle(text: string): string {
  const words = text.trim().split(/\s+/).slice(0, 6).join(" ");
  return words.length > 50 ? words.slice(0, 47) + "…" : words;
}

export function WorkspaceChat({ workspaceId, userId, userName }: WorkspaceChatProps) {
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>("auto");
  const queryClient = useQueryClient();

  // Chat history
  const chatListQuery = useChatListChats(workspaceId);
  const chatList = chatListQuery.data?.status === 200 ? chatListQuery.data.data : [];

  const {
    messages,
    isLoading,
    error,
    activeChatId,
    setActiveChatId,
    sendMessage,
    clearMessages,
    loadChat,
  } = useChat({
    userId,
    workspaceId,
    answerStyle,
    onChatCreated: async () => {
      // Refetch chat list and auto-set activeChatId to the most recent chat
      const result = await queryClient.fetchQuery({
        queryKey: getChatListChatsQueryKey(workspaceId),
        queryFn: () => chatListChats(workspaceId),
      });
      if (result.status === 200 && result.data.length > 0) {
        const newestChat = result.data[0];
        setActiveChatId(newestChat.id);
        // Auto-title: if the chat has no real title, set it from the first message
        const existingTitle = newestChat.title?.trim();
        const isDefaultTitle = !existingTitle || existingTitle === "Untitled Chat";
        const autoTitle = makeAutoTitle(firstMessageRef.current);
        if (isDefaultTitle && autoTitle) {
          updateTitleMutation.mutate(
            { chatId: newestChat.id, data: { title: autoTitle } },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getChatListChatsQueryKey(workspaceId) });
              },
            },
          );
        }
      }
    },
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const drawerTitleInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const coursesQuery = useCoursesServiceListCourses(workspaceId);
  const createCourseMutation = useCoursesServiceCreateCourse();
  const createNoteMutation = useNotesServiceCreateNote();
  const updateTitleMutation = useChatUpdateChatTitle();
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  /** Whether the current edit session is for the header title (vs. drawer row). */
  const [editingInHeader, setEditingInHeader] = useState(false);
  /** Stores the last-seen title so we don't PATCH when nothing changed. */
  const editingOriginalRef = useRef<string>("");
  /** Stores the first message text so we can auto-generate a title. */
  const firstMessageRef = useRef<string>("");

  // Create note dialog
  const [showCreateNoteDialog, setShowCreateNoteDialog] = useState(false);
  const [showNewCourseForm, setShowNewCourseForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseInstructor, setNewCourseInstructor] = useState("");
  const [newCourseCredits, setNewCourseCredits] = useState("0");
  const [newCourseError, setNewCourseError] = useState<string | null>(null);

  const isLanding = messages.length === 0;
  const firstName = userName ? userName.split(" ")[0] : "";
  const landingGreeting = useMemo(() => getLandingGreeting(firstName), [firstName]);

  const courses =
    coursesQuery.data?.status === 200
      ? coursesQuery.data.data.filter((course) => course.workspace_id === workspaceId)
      : [];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, [input]);

  // Focus the title input exactly once when an edit session opens.
  // Using useEffect (vs. a callback ref) prevents refocus-on-every-keystroke,
  // which in some browsers/React 19 can swallow keystrokes or reset the caret.
  useEffect(() => {
    if (!editingTitleId) return;
    const el = editingInHeader ? titleInputRef.current : drawerTitleInputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editingTitleId, editingInHeader]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    // Capture first message for auto-title (only for brand new chats)
    if (messages.length === 0) {
      firstMessageRef.current = input.trim();
    }
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCreateNote = () => {
    setShowCreateNoteDialog(true);
  };

  const handleLoadChat = async (chatId: string) => {
    await loadChat(chatId);
    setShowHistoryDrawer(false);
  };

  const handleNewChat = () => {
    clearMessages();
    setShowHistoryDrawer(false);
  };

  const handleStartRename = (chatId: string, currentTitle: string, inHeader: boolean) => {
    editingOriginalRef.current = currentTitle;
    setEditingInHeader(inHeader);
    setEditingTitleId(chatId);
    setEditingTitleValue(currentTitle);
  };

  const handleCancelRename = () => {
    setEditingTitleId(null);
    setEditingTitleValue("");
  };

  const handleSaveRename = (chatId: string) => {
    const nextTitle = editingTitleValue.trim();
    const prevTitle = editingOriginalRef.current.trim();

    // Close the editor first so the user gets immediate feedback.
    setEditingTitleId(null);

    // Don't fire a PATCH when the title is empty or unchanged.
    if (!nextTitle || nextTitle === prevTitle) return;

    updateTitleMutation.mutate(
      { chatId, data: { title: nextTitle } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getChatListChatsQueryKey(workspaceId),
          });
        },
      },
    );
  };

  const resetNewCourseForm = () => {
    setShowNewCourseForm(false);
    setNewCourseTitle("");
    setNewCourseInstructor("");
    setNewCourseCredits("0");
    setNewCourseError(null);
  };

  const resetCreateNoteDialog = () => {
    resetNewCourseForm();
    setNoteTitle("");
    setNoteError(null);
  };

  const createNoteInCourse = (courseId: string) => {
    const title = noteTitle.trim() || "Untitled Note";

    createNoteMutation.mutate(
      {
        data: {
          course_id: courseId,
          title,
          content: "",
        },
      },
      {
        onSuccess: (response) => {
          if (response.status !== 201) {
            setNoteError("Failed to create note.");
            return;
          }

          queryClient.invalidateQueries({
            queryKey: getNotesServiceListNotesQueryKey(courseId),
          });
          setShowCreateNoteDialog(false);
          resetCreateNoteDialog();
          navigate({
            to: "/c/$courseId/n/$notesId",
            params: { courseId, notesId: response.data.id },
          });
        },
        onError: () => {
          setNoteError("Failed to create note.");
        },
      },
    );
  };

  const handleSelectCourse = (courseId: string) => {
    createNoteInCourse(courseId);
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();

    const title = newCourseTitle.trim();
    const instructor = newCourseInstructor.trim();
    if (!title || !instructor) {
      setNewCourseError("Course title and instructor are required.");
      return;
    }

    createCourseMutation.mutate(
      {
        data: {
          workspace_id: workspaceId,
          title,
          instructor,
          credits: Number(newCourseCredits) || 0,
        },
      },
      {
        onSuccess: (response) => {
          if (response.status !== 201) {
            setNewCourseError("Failed to create course.");
            return;
          }

          queryClient.invalidateQueries({
            queryKey: getCoursesServiceListCoursesQueryKey(workspaceId),
          });
          createNoteInCourse(response.data.id);
        },
        onError: () => {
          setNewCourseError("Failed to create course.");
        },
      },
    );
  };

  const answerStyleSelect = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1 px-2 text-xs">
          {ANSWER_STYLES[answerStyle]}
          <ChevronDownIcon className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {Object.entries(ANSWER_STYLES).map(([value, label]) => (
          <DropdownMenuItem key={value} onClick={() => setAnswerStyle(value as AnswerStyle)}>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // --- Create note dialog (shared between landing & chat) ---
  const createNoteDialog = (
    <Dialog
      open={showCreateNoteDialog}
      onOpenChange={(open) => {
        setShowCreateNoteDialog(open);
        if (!open) resetCreateNoteDialog();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create note</DialogTitle>
          <DialogDescription>
            Name the note, then choose a course or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field>
            <FieldLabel>Note Title</FieldLabel>
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g. Lecture 2: Trees"
            />
          </Field>
          {noteError && <FieldError>{noteError}</FieldError>}

          {courses.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Courses</div>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-1">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => handleSelectCourse(course.id)}
                    disabled={createNoteMutation.isPending}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <BookOpenIcon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{course.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {course.instructor || "No instructor"} - {course.credits} credits
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!showNewCourseForm ? (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowNewCourseForm(true)}
            >
              <PlusIcon className="size-4" />
              Create new course
            </Button>
          ) : (
            <form onSubmit={handleCreateCourse} className="space-y-3 rounded-lg border p-3">
              <Field>
                <FieldLabel>Course Title</FieldLabel>
                <Input
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="e.g. Data Structures"
                />
              </Field>
              <Field>
                <FieldLabel>Instructor</FieldLabel>
                <Input
                  value={newCourseInstructor}
                  onChange={(e) => setNewCourseInstructor(e.target.value)}
                  placeholder="e.g. Prof. Smith"
                />
              </Field>
              <Field>
                <FieldLabel>Credits</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  value={newCourseCredits}
                  onChange={(e) => setNewCourseCredits(e.target.value)}
                />
              </Field>
              {newCourseError && <FieldError>{newCourseError}</FieldError>}
              <DialogFooter className="-mx-3 -mb-3">
                <Button type="button" variant="outline" onClick={resetNewCourseForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCourseMutation.isPending || createNoteMutation.isPending}
                >
                  {createCourseMutation.isPending ? "Creating..." : "Create course"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // --- History drawer (right-side slide-over) ---
  const historyDrawer = (
    <>
      {/* Backdrop */}
      {showHistoryDrawer && (
        <div
          role="button"
          tabIndex={-1}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setShowHistoryDrawer(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowHistoryDrawer(false);
          }}
        />
      )}
      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l bg-background shadow-xl transition-transform duration-200 ${
          showHistoryDrawer ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Chat history</h2>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setShowHistoryDrawer(false)}
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="border-b px-3 py-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs"
            onClick={handleNewChat}
          >
            <PlusIcon className="size-3.5" />
            New chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chatListQuery.isLoading ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              Loading...
            </div>
          ) : chatList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <MessageSquareIcon className="size-6 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-0.5 p-2">
              {chatList.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent ${
                    activeChatId === chat.id ? "bg-accent" : ""
                  }`}
                >
                  {editingTitleId === chat.id ? (
                    <input
                      ref={drawerTitleInputRef}
                      className="min-w-0 flex-1 rounded border bg-background px-2 py-0.5 text-sm outline-none focus:border-primary"
                      value={editingTitleValue}
                      onChange={(e) => setEditingTitleValue(e.target.value)}
                      onBlur={() => handleSaveRename(chat.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          handleCancelRename();
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleLoadChat(chat.id)}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <div className="truncate text-sm font-medium">
                        {chat.title || "Untitled chat"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {timeAgo(chat.created_at)}
                      </div>
                    </button>
                  )}
                  {editingTitleId !== chat.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      title="Rename"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(chat.id, chat.title || "", false);
                      }}
                    >
                      <PencilIcon className="size-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  // --- Landing state (Claude-like) ---
  if (isLanding) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8">
          {/* Greeting */}
          <h1 className="text-3xl font-semibold tracking-tight">{landingGreeting}</h1>

          {/* Input box — send button inline with textarea */}
          <form onSubmit={handleSubmit} className="w-full">
            <div className="flex min-h-14 items-center gap-2 rounded-2xl border bg-card/80 px-4 py-3 shadow-sm transition-colors focus-within:border-primary/50 focus-within:bg-card">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your notes..."
                rows={1}
                className="min-h-7 flex-1 resize-none bg-transparent py-0.5 text-sm leading-6 outline-none placeholder:text-muted-foreground/60"
              />
              {answerStyleSelect}
              <Button
                type="submit"
                size="icon"
                className="size-8 shrink-0 rounded-lg"
                disabled={isLoading || !input.trim()}
              >
                <SendIcon className="size-4" />
              </Button>
            </div>
          </form>

          {/* Quick actions */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {AI_SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  firstMessageRef.current = s.prompt;
                  sendMessage(s.prompt);
                }}
                className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <s.icon className="size-3.5" />
                {s.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleCreateNote}
              className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <PlusIcon className="size-3.5" />
              Create note
            </button>
          </div>

          {/* Recent chats — subtle, max 3 */}
          {chatList.length > 0 && (
            <div className="w-full max-w-md">
              <div className="space-y-0.5">
                {chatList.slice(0, 3).map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => handleLoadChat(chat.id)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent/60"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <MessageSquareIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
                      <span className="truncate text-xs text-muted-foreground">
                        {chat.title || "Untitled chat"}
                      </span>
                    </div>
                    <span className="ml-3 shrink-0 text-[10px] text-muted-foreground/50">
                      {timeAgo(chat.created_at)}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                >
                  <HistoryIcon className="size-3" />
                  View all ({chatList.length})
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="w-full rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>
        {createNoteDialog}
        {historyDrawer}
      </div>
    );
  }

  // --- Chat state (full conversation view) ---
  return (
    <div className="flex flex-1 flex-col">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <SparklesIcon className="size-4 shrink-0 text-primary" />
          {activeChatId && editingTitleId === activeChatId ? (
            <input
              ref={titleInputRef}
              className="min-w-0 rounded border bg-background px-2 py-0.5 text-sm font-medium text-foreground outline-none focus:border-primary"
              value={editingTitleValue}
              onChange={(e) => setEditingTitleValue(e.target.value)}
              onBlur={() => handleSaveRename(activeChatId)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  // Let blur trigger the save instead of double-saving.
                  e.currentTarget.blur();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  handleCancelRename();
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="group flex min-w-0 cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:bg-accent/60 disabled:cursor-default disabled:hover:bg-transparent"
              title={activeChatId ? "Click to rename" : undefined}
              onClick={() => {
                if (!activeChatId) return;
                const chat = chatList.find((c) => c.id === activeChatId);
                handleStartRename(activeChatId, chat?.title || "Untitled chat", true);
              }}
              disabled={!activeChatId}
            >
              <span className="truncate font-medium">
                {activeChatId
                  ? chatList.find((c) => c.id === activeChatId)?.title || "Untitled chat"
                  : "AI Chat"}
              </span>
              {activeChatId && (
                <PencilIcon className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
              )}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => {
              setShowHistoryDrawer(true);
              // Refetch chat list when opening drawer
              chatListQuery.refetch();
            }}
            title="Chat history"
          >
            <HistoryIcon className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={clearMessages}>
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="w-full max-w-7xl space-y-4 px-4 py-4 sm:px-6 lg:px-8">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-2 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        </div>
      )}

      {/* Input — send button inline */}
      <div className="w-full max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit}>
          <div className="flex min-h-14 items-center gap-2 rounded-2xl border bg-card/80 px-4 py-3 shadow-sm transition-colors focus-within:border-primary/50 focus-within:bg-card">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a question..."
              rows={1}
              disabled={isLoading}
              className="min-h-7 flex-1 resize-none bg-transparent py-0.5 text-sm leading-6 outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
            />
            {answerStyleSelect}
            <Button
              type="submit"
              size="icon"
              className="size-8 shrink-0 rounded-lg"
              disabled={isLoading || !input.trim()}
            >
              <SendIcon className="size-4" />
            </Button>
          </div>
        </form>
      </div>

      {historyDrawer}
    </div>
  );
}
