import { createFileRoute } from "@tanstack/react-router";
import { AssignmentKanbanDetail } from "@/components/assignment-kanban";

export const Route = createFileRoute("/_pathlessLayout/_nested-layout/route-b")({
  validateSearch: (search: Record<string, unknown>) => ({
    courseId: typeof search.courseId === "string" ? search.courseId : undefined,
    assignmentId: typeof search.assignmentId === "string" ? search.assignmentId : undefined,
  }),
  component: LayoutBComponent,
});

function LayoutBComponent() {
  const search = Route.useSearch();

  if (!search.courseId) {
    return <div>Missing course id.</div>;
  }

  return (
    <AssignmentKanbanDetail courseId={search.courseId} assignmentId={search.assignmentId} />
  );
}
