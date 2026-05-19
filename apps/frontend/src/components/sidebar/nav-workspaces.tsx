"use client";

import {
  useCoursesServiceCreateCourse,
  useCoursesServiceDeleteCourse,
  useCoursesServiceListCourses,
  getCoursesServiceListCoursesQueryKey,
  useCoursesServiceUpdateCourse,
} from "@/api/courses/courses";
import {
  useWorkspacesServiceDeleteWorkspace,
  useWorkspacesServiceGetWorkspace,
  useWorkspacesServiceUpdateWorkspace,
  getWorkspacesServiceListWorkspacesQueryKey,
} from "@/api/workspaces/workspaces";
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
  BookOpenIcon,
  PlusIcon,
  PencilIcon,
  SettingsIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SunIcon,
  MoonIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CoursesServiceCreateCourseBody,
  CoursesServiceUpdateCourseBody,
} from "@/api/courses/courses.zod";
import { WorkspacesServiceUpdateWorkspaceBody } from "@/api/workspaces/workspaces.zod";
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
import { useTheme } from "@/hooks/use-theme";

interface NavWorkspacesProps {
  workspaceId: string;
}

interface CourseItem {
  id: string;
  workspace_id: string;
  title: string;
  instructor: string;
  credits: number;
  color?: string;
  position: number;
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

export function NavWorkspaces({ workspaceId }: NavWorkspacesProps) {
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const router = useRouter();
  const coursesQuery = useCoursesServiceListCourses(workspaceId);
  const deleteCourseMutation = useCoursesServiceDeleteCourse();
  const createCourseMutation = useCoursesServiceCreateCourse();
  const updateCourseMutation = useCoursesServiceUpdateCourse();

  const workspaceQuery = useWorkspacesServiceGetWorkspace(workspaceId);
  const updateWorkspaceMutation = useWorkspacesServiceUpdateWorkspace();
  const deleteWorkspaceMutation = useWorkspacesServiceDeleteWorkspace();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [showEditWorkspaceDialog, setShowEditWorkspaceDialog] = useState(false);

  const courses =
    coursesQuery.data?.status === 200
      ? [...coursesQuery.data.data]
          .filter((course) => course.workspace_id === workspaceId)
          .sort((a, b) => a.position - b.position)
      : [];

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm({
    resolver: zodResolver(CoursesServiceCreateCourseBody),
    defaultValues: {
      workspace_id: workspaceId,
      title: "",
      instructor: "",
      credits: 0,
      position: 0,
      color: "#3b82f6",
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm({
    resolver: zodResolver(CoursesServiceUpdateCourseBody),
  });

  const {
    register: registerWorkspace,
    handleSubmit: handleSubmitWorkspace,
    reset: resetWorkspace,
    formState: { errors: errorsWorkspace },
  } = useForm({
    resolver: zodResolver(WorkspacesServiceUpdateWorkspaceBody),
  });

  useEffect(() => {
    if (workspaceQuery.data?.status === 200) {
      resetWorkspace({
        name: workspaceQuery.data.data.name,
      });
    }
  }, [workspaceQuery.data, resetWorkspace]);

  if (coursesQuery.isLoading || coursesQuery.data?.status !== 200) {
    return null;
  }

  const onDeleteCourse = (courseId: string) => {
    if (confirm("Are you sure you want to delete this course?")) {
      deleteCourseMutation.mutate(
        { courseId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getCoursesServiceListCoursesQueryKey(workspaceId),
            });
          },
        },
      );
    }
  };

  const onReorderCourse = (courseId: string, direction: "up" | "down") => {
    const currentIndex = courses.findIndex((c) => c.id === courseId);
    let newPosition: number | null = null;

    if (direction === "up" && currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevPrevCourse = courses[prevIndex - 1];
      const prevCourse = courses[prevIndex];

      if (!prevPrevCourse) {
        newPosition = prevCourse.position / 2;
      } else {
        newPosition = (prevPrevCourse.position + prevCourse.position) / 2;
      }
    } else if (direction === "down" && currentIndex < courses.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextCourse = courses[nextIndex];
      const nextNextCourse = courses[nextIndex + 1];

      if (!nextNextCourse) {
        newPosition = nextCourse.position + 1000;
      } else {
        newPosition = (nextCourse.position + nextNextCourse.position) / 2;
      }
    }

    if (newPosition !== null) {
      updateCourseMutation.mutate(
        { courseId, data: { position: newPosition } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getCoursesServiceListCoursesQueryKey(workspaceId),
            });
          },
        },
      );
    }
  };

  const onAddSubmit = handleSubmitAdd((data) => {
    const maxPosition = courses.length > 0 ? Math.max(...courses.map((c) => c.position)) : 0;
    createCourseMutation.mutate(
      { data: { ...data, workspace_id: workspaceId, position: maxPosition + 1000 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getCoursesServiceListCoursesQueryKey(workspaceId),
          });
          setShowAddDialog(false);
          resetAdd();
        },
      },
    );
  });

  const onEditSubmit = handleSubmitEdit((data) => {
    if (!editingCourse) return;
    updateCourseMutation.mutate(
      { courseId: editingCourse.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getCoursesServiceListCoursesQueryKey(workspaceId),
          });
          setEditingCourse(null);
        },
      },
    );
  });

  const handleEditClick = (course: CourseItem) => {
    setEditingCourse(course);
    resetEdit({
      title: course.title,
      instructor: course.instructor,
      credits: course.credits,
      color: course.color || "#3b82f6",
    });
  };

  const onUpdateWorkspaceSubmit = handleSubmitWorkspace((data) => {
    updateWorkspaceMutation.mutate(
      { workspaceId, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getWorkspacesServiceListWorkspacesQueryKey(),
          });
          workspaceQuery.refetch();
          setShowEditWorkspaceDialog(false);
        },
      },
    );
  });

  const onDeleteWorkspace = () => {
    if (
      confirm("Are you sure you want to delete this workspace? All data within it will be lost.")
    ) {
      deleteWorkspaceMutation.mutate(
        { workspaceId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getWorkspacesServiceListWorkspacesQueryKey(),
            });
            router.navigate({ to: "/" });
          },
        },
      );
    }
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Courses</SidebarGroupLabel>
        <SidebarMenu>
          {courses.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <Link to="/c/$courseId/a" params={{ courseId: item.id }}>
                  <BookOpenIcon className="shrink-0" style={{ color: item.color || "#3b82f6" }} />
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
                  <DropdownMenuItem onClick={() => handleEditClick(item)}>
                    <PencilIcon className="text-muted-foreground" />
                    <span>Edit Course</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onReorderCourse(item.id, "up")}>
                    <ArrowUpIcon className="text-muted-foreground" />
                    <span>Move Up</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onReorderCourse(item.id, "down")}>
                    <ArrowDownIcon className="text-muted-foreground" />
                    <span>Move Down</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteCourse(item.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2Icon />
                    <span>Delete Course</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-sidebar-foreground/70"
              tooltip={"Add Course"}
              onClick={() => setShowAddDialog(true)}
            >
              <PlusIcon className="text-sidebar-foreground/70" />
              <span>Add Course</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup className="mt-auto">
        <SidebarMenu>
          <ThemeToggleItem />
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Workspace Settings"
              onClick={() => setShowEditWorkspaceDialog(true)}
            >
              <SettingsIcon />
              <span>Workspace Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              tooltip="Delete Workspace"
              onClick={onDeleteWorkspace}
            >
              <Trash2Icon />
              <span>Delete Workspace</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Course</DialogTitle>
          </DialogHeader>
          <form onSubmit={onAddSubmit} className="space-y-4">
            <Field>
              <FieldLabel>Course Title</FieldLabel>
              <Input {...registerAdd("title")} placeholder="e.g. Data Structures" />
              {errorsAdd.title && <FieldError>{errorsAdd.title.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>Instructor</FieldLabel>
              <Input {...registerAdd("instructor")} placeholder="e.g. Prof. Smith" />
              {errorsAdd.instructor && <FieldError>{errorsAdd.instructor.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>Credits</FieldLabel>
              <Input
                type="number"
                {...registerAdd("credits", { valueAsNumber: true })}
                placeholder="e.g. 3"
              />
              {errorsAdd.credits && <FieldError>{errorsAdd.credits.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>Color</FieldLabel>
              <Input type="color" {...registerAdd("color")} className="h-10 p-1 w-full" />
              {errorsAdd.color && <FieldError>{errorsAdd.color.message}</FieldError>}
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCourseMutation.isPending}>
                {createCourseMutation.isPending ? "Adding..." : "Add Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCourse} onOpenChange={(open) => !open && setEditingCourse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          <form onSubmit={onEditSubmit} className="space-y-4">
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
            <Field>
              <FieldLabel>Color</FieldLabel>
              <Input type="color" {...registerEdit("color")} className="h-10 p-1 w-full" />
              {errorsEdit.color && <FieldError>{errorsEdit.color.message}</FieldError>}
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingCourse(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateCourseMutation.isPending}>
                {updateCourseMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditWorkspaceDialog} onOpenChange={setShowEditWorkspaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workspace Settings</DialogTitle>
          </DialogHeader>
          <form onSubmit={onUpdateWorkspaceSubmit} className="space-y-4">
            <Field>
              <FieldLabel>Workspace Name</FieldLabel>
              <Input {...registerWorkspace("name")} placeholder="e.g. My Semester 1" />
              {errorsWorkspace.name && <FieldError>{errorsWorkspace.name.message}</FieldError>}
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditWorkspaceDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateWorkspaceMutation.isPending}>
                {updateWorkspaceMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
