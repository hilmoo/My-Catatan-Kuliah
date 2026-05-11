import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/posts")({
  component: PostsRouteComponent,
});

function PostsRouteComponent() {
  return <Outlet />;
}