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
  BookOpenIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  LightbulbIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
  SparklesIcon,
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

export function WorkspaceChat({ workspaceId, userId, userName }: WorkspaceChatProps) {
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>("auto");
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat({
    userId,
    workspaceId,
    answerStyle,
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const coursesQuery = useCoursesServiceListCourses(workspaceId);
  const createCourseMutation = useCoursesServiceCreateCourse();
  const createNoteMutation = useNotesServiceCreateNote();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
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
                onClick={() => sendMessage(s.prompt)}
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

          {/* Error */}
          {error && (
            <div className="w-full rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>
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
      </div>
    );
  }

  // --- Chat state (full conversation view) ---
  return (
    <div className="flex flex-1 flex-col">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SparklesIcon className="size-4 text-primary" />
          <span className="font-medium">AI Chat</span>
        </div>
        <Button variant="ghost" size="icon" className="size-8" onClick={clearMessages}>
          <Trash2Icon className="size-4" />
        </Button>
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
    </div>
  );
}
