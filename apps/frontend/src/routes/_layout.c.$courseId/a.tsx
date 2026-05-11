import { createFileRoute } from "@tanstack/react-router";
import { AssignmentKanban } from "@/components/assignment-kanban";

export const Route = createFileRoute("/_layout/c/$courseId/a")({
  component: RouteComponent,
});

function RouteComponent() {
  const { courseId } = Route.useParams();

  return <AssignmentKanban courseId={courseId} />;
}
