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
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

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
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden px-[100px]">
          <Outlet />
        </div>
      </SidebarInset>

      {/* Floating chat aside */}
      <ChatAside workspaceId={workspaceId} userId={userId} />
    </>
  );
}
