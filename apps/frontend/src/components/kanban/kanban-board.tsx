import {
  useAssignmentsServiceUpdateAssignment,
} from "@/api/assignments/assignments";
import { AssignmentsAssignmentStatus } from "@/api/model/assignmentsAssignmentStatus";
import { KanbanColumn } from "./kanban-column";
import { useQueryClient } from "@tanstack/react-query";
import { getAssignmentsServiceListAssignmentsQueryKey } from "@/api/assignments/assignments";
import type { AssignmentsListResponse, AssignmentsResponse } from "@/api/model";

interface KanbanBoardProps {
  courseId: string;
  assignments: AssignmentsListResponse;
}

export function KanbanBoard({ courseId, assignments }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const updateAssignment = useAssignmentsServiceUpdateAssignment();

  const handleDragStart = (e: React.DragEvent, assignment: AssignmentsResponse) => {
    e.dataTransfer.setData("assignmentId", assignment.id);
    e.dataTransfer.setData("currentStatus", assignment.status);
    e.dataTransfer.setData("currentPosition", assignment.position.toString());
  };

  const handleDrop = async (
    e: React.DragEvent,
    newStatus: AssignmentsAssignmentStatus,
    targetAssignmentId?: string,
  ) => {
    e.preventDefault();
    const assignmentId = e.dataTransfer.getData("assignmentId");
    const currentStatus = e.dataTransfer.getData("currentStatus") as AssignmentsAssignmentStatus;

    // Get assignments for the target status, sorted by position
    const columnAssignments = assignments
      .filter((a) => a.status === newStatus)
      .sort((a, b) => a.position - b.position);

    let newPosition: number;

    if (columnAssignments.length === 0) {
      newPosition = 1000;
    } else if (!targetAssignmentId) {
      // Dropped on the column itself, add to end
      newPosition = columnAssignments[columnAssignments.length - 1].position + 1000;
    } else {
      const targetIndex = columnAssignments.findIndex((a) => a.id === targetAssignmentId);

      if (assignmentId === targetAssignmentId) return;

      const prevAssignment = columnAssignments[targetIndex - 1];
      const nextAssignment = columnAssignments[targetIndex];

      if (!prevAssignment) {
        // Dropped at the beginning
        newPosition = nextAssignment.position / 2;
      } else {
        // Dropped between prev and next
        if (prevAssignment.position === nextAssignment.position) {
          newPosition = prevAssignment.position + 0.0001;
        } else {
          newPosition = (prevAssignment.position + nextAssignment.position) / 2;
        }
      }
    }

    if (currentStatus === newStatus && assignmentId === targetAssignmentId) return;

    // Optimistic update
    const previousAssignments = queryClient.getQueryData(
      getAssignmentsServiceListAssignmentsQueryKey(courseId),
    );

    queryClient.setQueryData(getAssignmentsServiceListAssignmentsQueryKey(courseId), (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((a: AssignmentsResponse) =>
          a.id === assignmentId ? { ...a, status: newStatus, position: newPosition } : a,
        ),
      };
    });

    try {
      await updateAssignment.mutateAsync({
        assignmentId,
        data: {
          status: newStatus,
          position: newPosition,
        },
      });
    } catch {
      // Rollback
      queryClient.setQueryData(
        getAssignmentsServiceListAssignmentsQueryKey(courseId),
        previousAssignments,
      );
    }
  };

  const columns: { status: AssignmentsAssignmentStatus; title: string }[] = [
    { status: AssignmentsAssignmentStatus.Todo, title: "To Do" },
    { status: AssignmentsAssignmentStatus.InProgress, title: "In Progress" },
    { status: AssignmentsAssignmentStatus.Done, title: "Done" },
  ];

  return (
    <div className="flex gap-4 p-4 h-full overflow-x-auto">
      {columns.map((column) => (
        <KanbanColumn
          key={column.status}
          status={column.status}
          title={column.title}
          assignments={assignments
            .filter((a) => a.status === column.status)
            .sort((a, b) => a.position - b.position)}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
