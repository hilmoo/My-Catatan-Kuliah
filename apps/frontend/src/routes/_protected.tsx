import { createFileRoute, Navigate, Outlet, useParams } from "@tanstack/react-router";
import { Sidebar } from "~/components/sidebar/sidebar";
import { useAuth } from "~/hooks/use-auth";
import { getLastWorkspaceId } from "~/lib/workspace-storage";

export const Route = createFileRoute("/_protected")({
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { state } = useAuth();
  const params = useParams({ strict: false }) as { workspaceId?: string };

  if (state === "loading") {
    return (
      <main className="full-screen-center">
        <p className="helper-text">Checking session…</p>
      </main>
    );
  }

  if (state === "unauthenticated") {
    return <Navigate to="/login" />;
  }

  if (state === "error") {
    return (
      <main className="full-screen-center">
        <p className="helper-text">Could not reach the server. Please retry.</p>
      </main>
    );
  }

  const sidebarWorkspaceId = params.workspaceId ?? getLastWorkspaceId() ?? null;

  return (
    <div className="app-shell">
      {sidebarWorkspaceId && <Sidebar workspaceId={sidebarWorkspaceId} />}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
