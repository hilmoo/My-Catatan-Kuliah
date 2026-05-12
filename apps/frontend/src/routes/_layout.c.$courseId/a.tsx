import { createFileRoute, Outlet } from "@tanstack/react-router";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import {
  getAssignmentsServiceListAssignmentsQueryOptions,
  useAssignmentsServiceListAssignments,
} from "@/api/assignments/assignments";
import { CreateAssignmentDialog } from "@/components/kanban/create-assignment-dialog";
import type { AssignmentsListResponse } from "@/api/model";

export const Route = createFileRoute("/_layout/c/$courseId/a")({
  component: RouteComponent,
  loader: async ({ params: { courseId }, context: { queryClient } }) => {
    await queryClient.ensureQueryData(getAssignmentsServiceListAssignmentsQueryOptions(courseId));
  },
});

function RouteComponent() {
  const { courseId } = Route.useParams();
  const { data } = useAssignmentsServiceListAssignments(courseId);

  const assignments = (data?.status === 200 ? data.data : []) as AssignmentsListResponse;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assignments</h1>
        <CreateAssignmentDialog courseId={courseId} />
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard courseId={courseId} assignments={assignments} />
      </div>
      <Outlet />
    </div>
  );
}
