import { useAssignmentsServiceUpdateAssignment } from "@/api/assignments/assignments";
import { AssignmentsAssignmentStatus } from "@/api/model/assignmentsAssignmentStatus";
import { KanbanColumn } from "./kanban-column";
import { useQueryClient } from "@tanstack/react-query";
import { getAssignmentsServiceListAssignmentsQueryKey } from "@/api/assignments/assignments";
import type { AssignmentsListResponse, AssignmentsResponse } from "@/api/model";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  closestCorners,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import { KanbanCard } from "./kanban-card";
import { createPortal } from "react-dom";

interface KanbanBoardProps {
  courseId: string;
  assignments: AssignmentsListResponse;
}

export function KanbanBoard({ courseId, assignments }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const updateAssignment = useAssignmentsServiceUpdateAssignment();
  const [activeAssignment, setActiveAssignment] = useState<AssignmentsResponse | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveAssignment(assignments.find((a) => a.id === active.id) || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Find the containers
    const activeAssignment = assignments.find((a) => a.id === activeId);
    if (!activeAssignment) return;

    const overAssignment = assignments.find((a) => a.id === overId);
    const isOverAColumn = Object.values(AssignmentsAssignmentStatus).includes(
      overId as AssignmentsAssignmentStatus,
    );

    const newStatus = isOverAColumn
      ? (overId as AssignmentsAssignmentStatus)
      : overAssignment?.status;

    if (!newStatus || activeAssignment.status === newStatus) return;

    // Optimistically update status in query cache when dragging between columns
    queryClient.setQueryData(getAssignmentsServiceListAssignmentsQueryKey(courseId), (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((a: AssignmentsResponse) =>
          a.id === activeId ? { ...a, status: newStatus } : a,
        ),
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAssignment(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeAssignment = assignments.find((a) => a.id === activeId);
    if (!activeAssignment) return;

    const overAssignment = assignments.find((a) => a.id === overId);
    const isOverAColumn = Object.values(AssignmentsAssignmentStatus).includes(
      overId as AssignmentsAssignmentStatus,
    );

    const newStatus = isOverAColumn
      ? (overId as AssignmentsAssignmentStatus)
      : overAssignment?.status || activeAssignment.status;

    // Get assignments for the target status, sorted by position
    const columnAssignments = assignments
      .filter((a) => a.status === newStatus && a.id !== activeId)
      .sort((a, b) => a.position - b.position);

    let newPosition: number;

    if (columnAssignments.length === 0) {
      newPosition = 1000;
    } else if (isOverAColumn) {
      // Dropped on the column itself, add to end
      newPosition = columnAssignments[columnAssignments.length - 1].position + 1000;
    } else {
      const targetIndex = columnAssignments.findIndex((a) => a.id === overId);

      const prevAssignment = columnAssignments[targetIndex - 1];
      const nextAssignment = columnAssignments[targetIndex];

      if (!prevAssignment) {
        // Dropped at the beginning
        newPosition = nextAssignment.position / 2;
      } else if (!nextAssignment) {
        // Dropped at the end of the list (but over the last item)
        newPosition = prevAssignment.position + 1000;
      } else {
        // Dropped between prev and next
        newPosition = (prevAssignment.position + nextAssignment.position) / 2;
      }
    }

    // Optimistic update
    const previousAssignments = queryClient.getQueryData(
      getAssignmentsServiceListAssignmentsQueryKey(courseId),
    );

    queryClient.setQueryData(getAssignmentsServiceListAssignmentsQueryKey(courseId), (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((a: AssignmentsResponse) =>
          a.id === activeId ? { ...a, status: newStatus, position: newPosition } : a,
        ),
      };
    });

    try {
      await updateAssignment.mutateAsync({
        assignmentId: activeId,
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

  const handleMove = async (assignmentId: string, newStatus: AssignmentsAssignmentStatus) => {
    const activeAssignment = assignments.find((a) => a.id === assignmentId);
    if (!activeAssignment || activeAssignment.status === newStatus) return;

    // Get assignments for the target status, sorted by position
    const columnAssignments = assignments
      .filter((a) => a.status === newStatus && a.id !== assignmentId)
      .sort((a, b) => a.position - b.position);

    const newPosition =
      columnAssignments.length > 0
        ? columnAssignments[columnAssignments.length - 1].position + 1000
        : 1000;

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

  const handleReorder = async (assignmentId: string, direction: "up" | "down") => {
    const activeAssignment = assignments.find((a) => a.id === assignmentId);
    if (!activeAssignment) return;

    const columnAssignments = assignments
      .filter((a) => a.status === activeAssignment.status)
      .sort((a, b) => a.position - b.position);

    const currentIndex = columnAssignments.findIndex((a) => a.id === assignmentId);
    let newPosition: number | null = null;

    if (direction === "up" && currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevPrevAssignment = columnAssignments[prevIndex - 1];
      const prevAssignment = columnAssignments[prevIndex];

      if (!prevPrevAssignment) {
        newPosition = prevAssignment.position / 2;
      } else {
        newPosition = (prevPrevAssignment.position + prevAssignment.position) / 2;
      }
    } else if (direction === "down" && currentIndex < columnAssignments.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextAssignment = columnAssignments[nextIndex];
      const nextNextAssignment = columnAssignments[nextIndex + 1];

      if (!nextNextAssignment) {
        newPosition = nextAssignment.position + 1000;
      } else {
        newPosition = (nextAssignment.position + nextNextAssignment.position) / 2;
      }
    }

    if (newPosition === null) return;

    // Optimistic update
    const previousAssignments = queryClient.getQueryData(
      getAssignmentsServiceListAssignmentsQueryKey(courseId),
    );

    queryClient.setQueryData(getAssignmentsServiceListAssignmentsQueryKey(courseId), (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((a: AssignmentsResponse) =>
          a.id === assignmentId ? { ...a, position: newPosition } : a,
        ),
      };
    });

    try {
      await updateAssignment.mutateAsync({
        assignmentId,
        data: {
          status: activeAssignment.status,
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 h-full overflow-x-auto snap-x snap-mandatory scroll-smooth">
        {columns.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            title={column.title}
            onMove={handleMove}
            onReorder={handleReorder}
            assignments={assignments
              .filter((a) => a.status === column.status)
              .sort((a, b) => a.position - b.position)}
          />
        ))}
      </div>

      {createPortal(
        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: "0.5",
                },
              },
            }),
          }}
        >
          {activeAssignment ? (
            <div className="w-[300px] rotate-3 scale-105 transition-transform">
              <KanbanCard assignment={activeAssignment} isOverlay />
            </div>
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}
