import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/c/$courseId/n/$notesId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello &quot;/$workspaceId/n/$notesId&quot;!</div>;
}
