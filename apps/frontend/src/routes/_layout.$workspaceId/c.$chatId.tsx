import { getAuthGetMeQueryOptions } from "@/api/auth/auth";
import { getWorkspacesServiceGetWorkspaceQueryOptions } from "@/api/workspaces/workspaces";
import { WorkspaceChat } from "@/components/chat/workspace-chat";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/$workspaceId/c/$chatId")({
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
  const { workspaceId, chatId } = Route.useParams();
  const { user } = Route.useLoaderData();

  return (
    <WorkspaceChat
      workspaceId={workspaceId}
      userId={user.id}
      userName={user.name}
      chatId={chatId}
    />
  );
}
