import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDownIcon, PlusIcon, BookOpenIcon, BuildingIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { CoursesServiceCreateCourseBody } from "@/api/courses/courses.zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  useCoursesServiceCreateCourse,
  useCoursesServiceGetCourse,
  useCoursesServiceListCourses,
  getCoursesServiceListCoursesQueryKey,
} from "@/api/courses/courses";

interface CourseSwitcherProps {
  courseId: string;
}

export function CourseSwitcher({ courseId }: CourseSwitcherProps) {
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const courseQuery = useCoursesServiceGetCourse(courseId);
  const createCourseMutation = useCoursesServiceCreateCourse();

  const rawData = courseQuery.data?.data;
  const workspaceId = rawData && "workspace_id" in rawData ? rawData.workspace_id : "";
  const course = rawData && "workspace_id" in rawData ? rawData : null;

  const coursesData = useCoursesServiceListCourses(workspaceId || "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(CoursesServiceCreateCourseBody),
    defaultValues: {
      workspace_id: workspaceId || "",
      title: "",
      instructor: "",
      credits: 0,
    },
  });

  useEffect(() => {
    if (workspaceId) {
      reset({
        workspace_id: workspaceId,
        title: "",
        instructor: "",
        credits: 0,
      });
    }
  }, [workspaceId, reset]);

  if (courseQuery.isLoading) {
    return <div className="p-2">Loading course...</div>;
  }

  if (courseQuery.data?.status !== 200 || !course) {
    return <div className="p-2">Failed to load course</div>;
  }

  if (coursesData.isLoading) {
    return <div className="p-2">Loading courses...</div>;
  }

  if (coursesData.data?.status !== 200) {
    return <div className="p-2">Failed to load courses</div>;
  }

  const courses = coursesData.data?.data || [];
  const activeCourse = courses.find((c) => c.id === courseId);

  const onSubmit = handleSubmit((data) => {
    if (!workspaceId) return;

    createCourseMutation.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getCoursesServiceListCoursesQueryKey(workspaceId),
          });
          setShowAddDialog(false);
          reset();
        },
      },
    );
  });

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <BookOpenIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeCourse?.title || "Select Course"}
                </span>
                <span className="truncate text-xs">Course</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link to="/$workspaceId" params={{ workspaceId }}>
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <BuildingIcon className="size-4" />
                </div>
                Go to Workspace
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Courses</DropdownMenuLabel>
            {courses.map((c) => (
              <DropdownMenuItem key={c.id} asChild className="gap-2 p-2">
                <Link to="/c/$courseId" params={{ courseId: c.id }}>
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <BookOpenIcon className="size-4" />
                  </div>
                  {c.title}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onSelect={(e) => {
                e.preventDefault();
                setShowAddDialog(true);
              }}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <PlusIcon className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">Add course</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Course</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field>
              <FieldLabel>Course Title</FieldLabel>
              <Input {...register("title")} placeholder="Enter course title" />
              {errors.title && <FieldError>{errors.title.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>Instructor</FieldLabel>
              <Input {...register("instructor")} placeholder="Enter instructor name" />
              {errors.instructor && <FieldError>{errors.instructor.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>Credits</FieldLabel>
              <Input
                {...register("credits", { valueAsNumber: true })}
                type="number"
                placeholder="Enter credits"
              />
              {errors.credits && <FieldError>{errors.credits.message}</FieldError>}
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCourseMutation.isPending}>
                {createCourseMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  );
}
