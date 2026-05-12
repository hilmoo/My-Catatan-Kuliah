import { useState } from "react";
import type { AssignmentsResponse } from "@/api/model";
import { AssignmentsAssignmentStatus } from "@/api/model/assignmentsAssignmentStatus";
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
  status: AssignmentsAssignmentStatus;
  title: string;
  assignments: AssignmentsResponse[];
  onDragStart: (e: React.DragEvent, assignment: AssignmentsResponse) => void;
  onDrop: (
    e: React.DragEvent,
    status: AssignmentsAssignmentStatus,
    targetAssignmentId?: string,
  ) => void;
}

export function KanbanColumn({
  status,
  title,
  assignments,
  onDragStart,
  onDrop,
}: KanbanColumnProps) {
  const [dragCount, setDragCount] = useState(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCount((prev) => prev + 1);
  };

  const handleDragLeave = () => {
    setDragCount((prev) => prev - 1);
  };

  const handleDropLocal = (e: React.DragEvent) => {
    setDragCount(0);
    onDrop(e, status);
  };

  const isOver = dragCount > 0;

  return (
    <div
      className={`flex flex-col flex-1 min-w-[300px] bg-muted/50 rounded-lg p-3 h-full transition-colors ${
        isOver ? "bg-muted ring-2 ring-primary/20" : ""
      }`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDropLocal}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
          {title} ({assignments.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto min-h-[100px]">
        {assignments.map((assignment) => (
          <KanbanCard
            key={assignment.id}
            assignment={assignment}
            onDragStart={onDragStart}
            onDrop={(e) => {
              e.stopPropagation();
              onDrop(e, status, assignment.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}
