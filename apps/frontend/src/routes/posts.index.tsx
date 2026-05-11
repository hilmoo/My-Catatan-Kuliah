import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/posts/")({
  component: PostsIndexRouteComponent,
});

function PostsIndexRouteComponent() {
  return <div>Posts home</div>;
}