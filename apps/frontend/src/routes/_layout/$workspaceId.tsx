import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/$workspaceId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
