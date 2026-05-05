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

interface NavWorkspacesProps {
  workspaceId: string;
}

type CourseItem = {
  id: string;
  workspace_id: string;
  title: string;
  instructor: string;
  credits: number;
};

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

  const courses = coursesQuery.data.data.filter((course) => course.workspace_id === workspaceId);

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

  const onAddSubmit = handleSubmitAdd((data) => {
    createCourseMutation.mutate(
      { data: { ...data, workspace_id: workspaceId } },
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
    if (confirm("Are you sure you want to delete this workspace? All data within it will be lost.")) {
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
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Courses</SidebarGroupLabel>
        <SidebarMenu>
          {courses.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton asChild>
                <Link to="/c/$courseId" params={{ courseId: item.id }}>
                  <BookOpenIcon />
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
                  <DropdownMenuItem onClick={() => handleEditClick(item)}>
                    <PencilIcon className="text-muted-foreground" />
                    <span>Edit Course</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDeleteCourse(item.id)}>
                    <Trash2Icon className="text-muted-foreground" />
                    <span>Delete Course</span>
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
              <span>Add Course</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setShowEditWorkspaceDialog(true)}>
              <SettingsIcon />
              <span>Workspace Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
