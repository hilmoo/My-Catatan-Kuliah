import { getWorkspacesServiceGetWorkspaceQueryOptions } from "@/api/workspaces/workspaces";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/$workspaceId")({
  component: RouteComponent,
  loader: async ({ params: { workspaceId }, context: { queryClient } }) => {
    const workspace = await queryClient.ensureQueryData(
      getWorkspacesServiceGetWorkspaceQueryOptions(workspaceId),
    );

    if (workspace.status !== 200) {
      throw redirect({ to: "/" });
    }

    return { workspace: workspace.data };
  },
});

function RouteComponent() {
  const workspaceId = Route.useParams().workspaceId;

  return (
    <>
      <AppSidebar workspaceId={workspaceId} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Build Your Application</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </>
  );
}
