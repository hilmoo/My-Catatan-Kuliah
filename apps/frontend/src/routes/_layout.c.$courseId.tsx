import { getCoursesServiceGetCourseQueryOptions } from "@/api/courses/courses";
import { useAuthGetMe } from "@/api/auth/auth";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ChatAside } from "@/components/chat/chat-aside";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_layout/c/$courseId")({
  component: RouteComponent,
  loader: async ({ params: { courseId }, context: { queryClient } }) => {
    const course = await queryClient.ensureQueryData(
      getCoursesServiceGetCourseQueryOptions(courseId),
    );

    if (course.status !== 200) {
      throw redirect({ to: "/" });
    }

    return { course: course.data };
  },
});

function RouteComponent() {
  const { courseId } = Route.useParams();
  const { course } = Route.useLoaderData();
  const { data: me } = useAuthGetMe();
  const routerState = useRouterState();

  const isAssignmentRoute = routerState.matches.some(
    (m) =>
      m.routeId === "/_layout/c/$courseId/a" ||
      m.routeId === "/_layout/c/$courseId/a/$assignmentId",
  );

  const activeNotesId = routerState.matches.find(
    (match) => match.routeId === "/_layout/c/$courseId/n/$notesId",
  )?.params.notesId;

  const isNoteRoute = !!activeNotesId;

  const userId = me?.status === 200 ? me.data.id : "";
  const workspaceId = course.workspace_id;

  return (
    <>
      <AppSidebar courseId={courseId} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{course.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 overflow-hidden",
            isAssignmentRoute && "px-2 lg:px-[100px]",
            isNoteRoute && "pl-[60px] pr-0 lg:px-[100px]",
            !isAssignmentRoute && !isNoteRoute && "px-[100px]",
          )}
        >
          <Outlet />
        </div>
      </SidebarInset>

      {/* Floating chat aside */}
      <ChatAside
        workspaceId={workspaceId}
        courseId={courseId}
        courseTitle={course.title}
        notesId={activeNotesId}
        userId={userId}
      />
    </>
  );
}
