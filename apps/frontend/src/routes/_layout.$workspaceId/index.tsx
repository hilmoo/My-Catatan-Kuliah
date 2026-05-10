import { getAuthGetMeQueryOptions } from "@/api/auth/auth";
import { getWorkspacesServiceGetWorkspaceQueryOptions } from "@/api/workspaces/workspaces";
import { WorkspaceChat } from "@/components/chat/workspace-chat";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/$workspaceId/")({
  component: RouteComponent,
  loader: async ({ params: { workspaceId }, context: { queryClient } }) => {
    const user = await queryClient.ensureQueryData(getAuthGetMeQueryOptions());

    if (user.status !== 200) {
      throw redirect({ to: "/login" });
    }
    const workspace = await queryClient.ensureQueryData(
      getWorkspacesServiceGetWorkspaceQueryOptions(workspaceId),
    );

    if (workspace.status !== 200) {
      throw redirect({ to: "/" });
    }

    return { user: user.data };
  },
});

function RouteComponent() {
  const { workspaceId } = Route.useParams();
  const { user } = Route.useLoaderData();

  const userId = user.id;
  const userName = user.name;

  return <WorkspaceChat workspaceId={workspaceId} userId={userId} userName={userName} />;
}
