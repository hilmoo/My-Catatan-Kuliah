import type { AssignmentsResponse } from "@/api/model";
import { AssignmentsAssignmentStatus } from "@/api/model/assignmentsAssignmentStatus";
import { KanbanCard } from "./kanban-card";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface KanbanColumnProps {
  status: AssignmentsAssignmentStatus;
  title: string;
  assignments: AssignmentsResponse[];
  onMove?: (id: string, status: AssignmentsAssignmentStatus) => void;
  onReorder?: (id: string, direction: "up" | "down") => void;
}

export function KanbanColumn({
  status,
  title,
  assignments,
  onMove,
  onReorder,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-1 min-w-[300px] sm:min-w-[350px] w-[85vw] sm:w-auto bg-muted/50 rounded-lg p-3 h-full transition-colors snap-center ${
        isOver ? "bg-muted ring-2 ring-primary/20" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
          {title} ({assignments.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto min-h-[100px]">
        <SortableContext
          id={status}
          items={assignments.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {assignments.map((assignment) => (
            <KanbanCard
              key={assignment.id}
              assignment={assignment}
              onMove={onMove}
              onReorder={onReorder}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
