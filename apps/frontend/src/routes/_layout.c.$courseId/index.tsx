import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/c/$courseId/")({
  component: RouteComponent,
  loader: ({ params }) => {
    throw redirect({ to: "/c/$courseId/a", params: { courseId: params.courseId } });
  },
});

function RouteComponent() {
  return <div>Hello /$courseId/!</div>;
}
