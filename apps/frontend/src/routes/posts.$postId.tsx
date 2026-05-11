import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/posts/$postId")({
  component: PostsPostIdRouteComponent,
});

function PostsPostIdRouteComponent() {
  const { postId } = Route.useParams();

  return <div>Post {postId}</div>;
}