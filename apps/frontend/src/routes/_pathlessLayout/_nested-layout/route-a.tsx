import { createFileRoute } from "@tanstack/react-router";
import { AssignmentKanban } from "@/components/assignment-kanban";

export const Route = createFileRoute("/_pathlessLayout/_nested-layout/route-a")({
  validateSearch: (search: Record<string, unknown>) => ({
    courseId: typeof search.courseId === "string" ? search.courseId : undefined,
  }),
  component: LayoutAComponent,
});

function LayoutAComponent() {
  const search = Route.useSearch();

  if (!search.courseId) {
    return <div>Missing course id.</div>;
  }

  return <AssignmentKanban courseId={search.courseId} />;
}
