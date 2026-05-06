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
import { Link, useRouter } from "@tanstack/react-router";
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

interface NavCoursesProps {
  courseId: string;
}

export function NavCourses({ courseId }: NavCoursesProps) {
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const router = useRouter();
  const notesQuery = useNotesServiceListNotes(courseId);
  const deleteNoteMutation = useNotesServiceDeleteNote();
  const updateNoteMutation = useNotesServiceUpdateNote();
  const createNoteMutation = useNotesServiceCreateNote();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditNoteDialog, setShowEditNoteDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<{ id: string; title: string } | null>(null);
  const [showEditCourseDialog, setShowEditCourseDialog] = useState(false);
  const courseQuery = useCoursesServiceGetCourse(courseId);
  const updateCourseMutation = useCoursesServiceUpdateCourse();
  const deleteCourseMutation = useCoursesServiceDeleteCourse();

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

  const notes = notesQuery.data.data;
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

  const onEditNote = (note: { id: string; title: string }) => {
    setEditingNote(note);
    resetEditNote({
      title: note.title,
    });
    setShowEditNoteDialog(true);
  };

  const onSubmit = handleSubmit((data) => {
    createNoteMutation.mutate(
      { data: { ...data, course_id: courseId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getNotesServiceListNotesQueryKey(courseId),
          });
          setShowAddDialog(false);
          reset();
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
      </SidebarGroup>

      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/c/$courseId/a" params={{ courseId }}>
                <ClipboardListIcon />
                <span>Assignments</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Notes</SidebarGroupLabel>
        <SidebarMenu>
          {notes.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton asChild>
                <Link to="/c/$courseId/n/$notesId" params={{ notesId: item.id, courseId }}>
                  <FileTextIcon />
                  <span>{item.title}</span>
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
                  <DropdownMenuItem onClick={() => onEditNote({ id: item.id, title: item.title })}>
                    <PencilIcon className="text-muted-foreground" />
                    <span>Edit Note</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDeleteNote(item.id)}>
                    <Trash2Icon className="text-muted-foreground" />
                    <span>Delete Note</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-sidebar-foreground/70"
              onClick={() => setShowAddDialog(true)}
            >
              <PlusIcon className="text-sidebar-foreground/70" />
              <span>Add Note</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setShowEditCourseDialog(true)}>
              <SettingsIcon />
              <span>Course Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
