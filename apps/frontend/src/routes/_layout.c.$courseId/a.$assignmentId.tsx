import { getAuthGetMeQueryOptions } from "@/api/auth/auth";
import { getAssignmentsServiceGetAssignmentQueryOptions } from "@/api/assignments/assignments";
import { FullSetupEditor } from "@/components/editor/editor";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { AssignmentsResponse } from "@/api/model";
import { UpdateAssignmentDialog } from "@/components/kanban/update-assignment-dialog";

export const Route = createFileRoute("/_layout/c/$courseId/a/$assignmentId")({
  component: RouteComponent,
  loader: async ({ params: { assignmentId, courseId }, context: { queryClient } }) => {
    const data = await queryClient.ensureQueryData(
      getAssignmentsServiceGetAssignmentQueryOptions(assignmentId),
    );

    if (data.status !== 200) {
      throw redirect({ to: "/c/$courseId/a", params: { courseId } });
    }

    const user = await queryClient.ensureQueryData(getAuthGetMeQueryOptions());

    if (user.status !== 200) {
      throw redirect({ to: "/login", params: { courseId } });
    }

    return { assignment: data.data, user: user.data };
  },
});

const AssignmentHeader = memo(
  ({ assignment, courseId }: { assignment: AssignmentsResponse; courseId: string }) => {
    return (
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/c/$courseId/a" params={{ courseId }}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{assignment.title}</h1>
          <p className="text-sm text-muted-foreground">
            Status: <span className="capitalize">{assignment.status}</span> | Due:{" "}
            {new Date(assignment.due_date).toLocaleDateString()}
          </p>
        </div>
        <div className="ml-auto">
          <UpdateAssignmentDialog assignment={assignment} />
        </div>
      </div>
    );
  },
);

AssignmentHeader.displayName = "AssignmentHeader";

function RouteComponent() {
  const { assignmentId, courseId } = Route.useParams();
  const { assignment, user } = Route.useLoaderData();
  const containerRef = useRef<HTMLDivElement>(null);

  if (!assignment) {
    return <div className="p-4">Assignment not found.</div>;
  }

  return (
    <div className="flex flex-col h-full py-6 space-y-4 overflow-hidden">
      <AssignmentHeader assignment={assignment} courseId={courseId} />

      <div
        className="flex-1 overflow-hidden border rounded-md relative bg-background px-4 py-1 flex flex-col ml-[50px] lg:ml-0"
        ref={containerRef}
      >
        <div className="flex-1 h-full overflow-hidden">
          <FullSetupEditor
            key={assignmentId}
            user={user}
            roomId={assignmentId}
            type="assignments"
            containerBoxRef={containerRef}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-[10px] text-muted-foreground uppercase">
        <div>
          <span className="font-medium">Created:</span>{" "}
          {new Date(assignment.created_at).toLocaleString()}
        </div>
        <div>
          <span className="font-medium">Updated:</span>{" "}
          {new Date(assignment.updated_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
