import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/c/$courseId/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello /$courseId/!</div>;
}
