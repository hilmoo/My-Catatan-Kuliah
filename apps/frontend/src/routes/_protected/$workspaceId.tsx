import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { WorkspaceDashboard } from "~/components/workspace/workspace-dashboard";
import { setLastWorkspaceId } from "~/lib/workspace-storage";

export const Route = createFileRoute("/_protected/$workspaceId")({
  component: WorkspacePage,
});

function WorkspacePage() {
  const { workspaceId } = Route.useParams();

  useEffect(() => {
    if (workspaceId) setLastWorkspaceId(workspaceId);
  }, [workspaceId]);

  return <WorkspaceDashboard workspaceId={workspaceId} />;
}
