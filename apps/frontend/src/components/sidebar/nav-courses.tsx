"use client";

import {
  useNotesServiceCreateNote,
  useNotesServiceDeleteNote,
  useNotesServiceListNotes,
  getNotesServiceListNotesQueryKey,
  useNotesServiceUpdateNote,
} from "@/api/notes/notes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  MoreHorizontalIcon,
  Trash2Icon,
  FileTextIcon,
  PlusIcon,
  UserIcon,
  GraduationCapIcon,
  SettingsIcon,
  PencilIcon,
  ClipboardListIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SunIcon,
  MoonIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NotesServiceCreateNoteBody, NotesServiceUpdateNoteBody } from "@/api/notes/notes.zod";
import { CoursesServiceUpdateCourseBody } from "@/api/courses/courses.zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCoursesServiceDeleteCourse,
  useCoursesServiceGetCourse,
  useCoursesServiceUpdateCourse,
  getCoursesServiceListCoursesQueryKey,
  getCoursesServiceGetCourseQueryKey,
} from "@/api/courses/courses";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";

interface NavCoursesProps {
  courseId: string;
}

function ThemeToggleItem() {
  const { theme, toggleTheme } = useTheme();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={theme === "dark" ? "Light Mode" : "Dark Mode"}
        onClick={toggleTheme}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function NavCourses({ courseId }: NavCoursesProps) {
  const { isMobile, state } = useSidebar();
  const queryClient = useQueryClient();
  const router = useRouter();
  const notesQuery = useNotesServiceListNotes(courseId);
  const deleteNoteMutation = useNotesServiceDeleteNote();
  const updateNoteMutation = useNotesServiceUpdateNote();
  const createNoteMutation = useNotesServiceCreateNote();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditNoteDialog, setShowEditNoteDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<{
    id: string;
    title: string;
    color?: string;
  } | null>(null);
  const [showEditCourseDialog, setShowEditCourseDialog] = useState(false);
  const courseQuery = useCoursesServiceGetCourse(courseId);
  const updateCourseMutation = useCoursesServiceUpdateCourse();
  const deleteCourseMutation = useCoursesServiceDeleteCourse();
  const navigate = useNavigate();

  const notes =
    notesQuery.data?.status === 200
      ? [...notesQuery.data.data].sort((a, b) => a.position - b.position)
      : [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(NotesServiceCreateNoteBody),
    defaultValues: {
      course_id: courseId,
      title: "",
      content: "",
      position: 0,
      color: "#3b82f6",
    },
  });

  const {
    register: registerEditNote,
    handleSubmit: handleSubmitEditNote,
    reset: resetEditNote,
    formState: { errors: errorsEditNote },
  } = useForm({
    resolver: zodResolver(NotesServiceUpdateNoteBody),
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm({
    resolver: zodResolver(CoursesServiceUpdateCourseBody),
  });

  useEffect(() => {
    if (courseQuery.data?.status === 200) {
      resetEdit({
        title: courseQuery.data.data.title,
        instructor: courseQuery.data.data.instructor,
        credits: courseQuery.data.data.credits,
      });
    }
  }, [courseQuery.data, resetEdit]);

  if (
    notesQuery.isLoading ||
    notesQuery.data?.status !== 200 ||
    courseQuery.isLoading ||
    courseQuery.data?.status !== 200
  ) {
    return null;
  }

  const course = courseQuery.data.data;

  const onDeleteNote = (noteId: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      deleteNoteMutation.mutate(
        { noteId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getNotesServiceListNotesQueryKey(courseId),
            });
          },
        },
      );
    }
  };

  const onEditNote = (note: { id: string; title: string; color?: string }) => {
    setEditingNote(note);
    resetEditNote({
      title: note.title,
      color: note.color || "#3b82f6",
    });
    setShowEditNoteDialog(true);
  };

  const onReorderNote = (noteId: string, direction: "up" | "down") => {
    const currentIndex = notes.findIndex((n) => n.id === noteId);
    let newPosition: number | null = null;

    if (direction === "up" && currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevPrevNote = notes[prevIndex - 1];
      const prevNote = notes[prevIndex];

      if (!prevPrevNote) {
        newPosition = prevNote.position / 2;
      } else {
        newPosition = (prevPrevNote.position + prevNote.position) / 2;
      }
    } else if (direction === "down" && currentIndex < notes.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextNote = notes[nextIndex];
      const nextNextNote = notes[nextIndex + 1];

      if (!nextNextNote) {
        newPosition = nextNote.position + 1000;
      } else {
        newPosition = (nextNote.position + nextNextNote.position) / 2;
      }
    }

    if (newPosition !== null) {
      updateNoteMutation.mutate(
        { noteId, data: { position: newPosition } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getNotesServiceListNotesQueryKey(courseId),
            });
          },
        },
      );
    }
  };

  const onSubmit = handleSubmit((data) => {
    const maxPosition = notes.length > 0 ? Math.max(...notes.map((n) => n.position)) : 0;
    createNoteMutation.mutate(
      { data: { ...data, course_id: courseId, position: maxPosition + 1000 } },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({
            queryKey: getNotesServiceListNotesQueryKey(courseId),
          });
          setShowAddDialog(false);
          reset();
          navigate({ to: "/c/$courseId/n/$notesId", params: { courseId, notesId: data.data.id } });
        },
      },
    );
  });

  const onUpdateNoteSubmit = handleSubmitEditNote((data) => {
    if (!editingNote) return;
    updateNoteMutation.mutate(
      { noteId: editingNote.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getNotesServiceListNotesQueryKey(courseId),
          });
          setShowEditNoteDialog(false);
          setEditingNote(null);
        },
      },
    );
  });

  const onUpdateCourseSubmit = handleSubmitEdit((data) => {
    updateCourseMutation.mutate(
      { courseId, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getCoursesServiceGetCourseQueryKey(courseId),
          });
          setShowEditCourseDialog(false);
        },
      },
    );
  });

  const onDeleteCourse = () => {
    if (confirm("Are you sure you want to delete this course? All data within it will be lost.")) {
      const workspaceId = course.workspace_id;
      deleteCourseMutation.mutate(
        { courseId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getCoursesServiceListCoursesQueryKey(workspaceId),
            });
            router.navigate({ to: "/$workspaceId", params: { workspaceId } });
          },
        },
      );
    }
  };

  return (
    <>
      <SidebarGroup>
        {state === "collapsed" ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={{
                  children: (
                    <div className="flex flex-col gap-1 p-1">
                      <div className="font-semibold">{course.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <UserIcon className="size-3" />
                        <span>{course.instructor}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <GraduationCapIcon className="size-3" />
                        <span>{course.credits} Credits</span>
                      </div>
                    </div>
                  ),
                  side: "right",
                  align: "start",
                }}
              >
                <GraduationCapIcon />
                <span>{course.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <Card className="shadow-none border-none bg-sidebar-accent/50 p-2 flex flex-col gap-1 px-3">
            <div className="text-sm font-semibold leading-tight truncate">{course.title}</div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
              <div className="flex items-center gap-1.5 truncate pr-2">
                <UserIcon className="size-3 shrink-0" />
                <span className="truncate">{course.instructor}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <GraduationCapIcon className="size-3" />
                <span>{course.credits}</span>
              </div>
            </div>
          </Card>
        )}
      </SidebarGroup>

      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Assignments">
              <Link to="/c/$courseId/a" params={{ courseId }}>
                <ClipboardListIcon />
                <span>Assignments</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Notes</SidebarGroupLabel>
        <SidebarMenu>
          {notes.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <Link to="/c/$courseId/n/$notesId" params={{ notesId: item.id, courseId }}>
                  <FileTextIcon className="shrink-0" style={{ color: item.color || "#3b82f6" }} />
                  <span className="truncate">{item.title}</span>
                </Link>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover className="aria-expanded:bg-muted">
                    <MoreHorizontalIcon />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem
                    onClick={() =>
                      onEditNote({ id: item.id, title: item.title, color: item.color })
                    }
                  >
                    <PencilIcon className="text-muted-foreground" />
                    <span>Edit Note</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onReorderNote(item.id, "up")}>
                    <ArrowUpIcon className="text-muted-foreground" />
                    <span>Move Up</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onReorderNote(item.id, "down")}>
                    <ArrowDownIcon className="text-muted-foreground" />
                    <span>Move Down</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteNote(item.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2Icon />
                    <span>Delete Note</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-sidebar-foreground/70"
              tooltip={"Add Note"}
              onClick={() => setShowAddDialog(true)}
            >
              <PlusIcon className="text-sidebar-foreground/70" />
              <span>Add Note</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup className="mt-auto">
        <SidebarMenu>
          <ThemeToggleItem />
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Course Settings"
              onClick={() => setShowEditCourseDialog(true)}
            >
              <SettingsIcon />
              <span>Course Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              tooltip="Delete Course"
              onClick={onDeleteCourse}
            >
              <Trash2Icon />
              <span>Delete Course</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field>
              <FieldLabel>Note Title</FieldLabel>
              <Input {...register("title")} placeholder="e.g. Lecture 1: Introduction" />
              {errors.title && <FieldError>{errors.title.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>Color</FieldLabel>
              <Input type="color" {...register("color")} className="h-10 p-1 w-full" />
              {errors.color && <FieldError>{errors.color.message}</FieldError>}
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createNoteMutation.isPending}>
                {createNoteMutation.isPending ? "Adding..." : "Add Note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditNoteDialog} onOpenChange={setShowEditNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <form onSubmit={onUpdateNoteSubmit} className="space-y-4">
            <Field>
              <FieldLabel>Note Title</FieldLabel>
              <Input {...registerEditNote("title")} placeholder="e.g. Lecture 1: Introduction" />
              {errorsEditNote.title && <FieldError>{errorsEditNote.title.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>Color</FieldLabel>
              <Input type="color" {...registerEditNote("color")} className="h-10 p-1 w-full" />
              {errorsEditNote.color && <FieldError>{errorsEditNote.color.message}</FieldError>}
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditNoteDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateNoteMutation.isPending}>
                {updateNoteMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditCourseDialog} onOpenChange={setShowEditCourseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          <form onSubmit={onUpdateCourseSubmit} className="space-y-4">
            <Field>
              <FieldLabel>Course Title</FieldLabel>
              <Input {...registerEdit("title")} placeholder="e.g. Data Structures" />
              {errorsEdit.title && <FieldError>{errorsEdit.title.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>Instructor</FieldLabel>
              <Input {...registerEdit("instructor")} placeholder="e.g. Prof. Smith" />
              {errorsEdit.instructor && <FieldError>{errorsEdit.instructor.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>Credits</FieldLabel>
              <Input
                type="number"
                {...registerEdit("credits", { valueAsNumber: true })}
                placeholder="e.g. 3"
              />
              {errorsEdit.credits && <FieldError>{errorsEdit.credits.message}</FieldError>}
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditCourseDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateCourseMutation.isPending}>
                {updateCourseMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
