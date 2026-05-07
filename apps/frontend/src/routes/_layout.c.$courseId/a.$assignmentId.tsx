import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/c/$courseId/a/$assignmentId")({
  component: RouteComponent,
});

// TODO: Add kanban detail board here
function RouteComponent() {
  return <div>Hello &quot;/$workspaceId/a/$courseId&quot;!</div>;
}
