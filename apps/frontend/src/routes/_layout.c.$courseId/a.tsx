import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/c/$courseId/a")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello &quot;/_layout/c/$courseId/a&quot;!</div>;
}
