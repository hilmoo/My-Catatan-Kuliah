import { createFileRoute } from "@tanstack/react-router";
import { AssignmentKanbanDetail } from "@/components/assignment-kanban";

export const Route = createFileRoute("/_layout/c/$courseId/a/$assignmentId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { courseId, assignmentId } = Route.useParams();

  return <AssignmentKanbanDetail courseId={courseId} assignmentId={assignmentId} />;
}
