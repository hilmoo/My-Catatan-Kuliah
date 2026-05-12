import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { AssignmentsResponse } from "@/api/model";
import { Link } from "@tanstack/react-router";
import { CalendarIcon, GripVertical } from "lucide-react";

interface KanbanCardProps {
  assignment: AssignmentsResponse;
  onDragStart: (e: React.DragEvent, assignment: AssignmentsResponse) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function KanbanCard({ assignment, onDragStart, onDrop }: KanbanCardProps) {
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
    onDrop(e);
  };

  const isOver = dragCount > 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, assignment)}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDropLocal}
      className="cursor-grab active:cursor-grabbing mb-3 relative group"
    >
      {isOver && (
        <div className="absolute -top-[6px] left-0 right-0 h-1.5 bg-primary rounded-full pointer-events-none z-10" />
      )}
      
      <Link
        to="/c/$courseId/a/$assignmentId"
        params={{
          courseId: assignment.course_id,
          assignmentId: assignment.id,
        }}
        className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      >
        <Card 
          className="w-full bg-background dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 group-hover:-translate-y-0.5"
        >
          <CardHeader className="p-3 pb-1 flex flex-row items-start justify-between gap-2 space-y-0">
            <CardTitle className="text-sm font-semibold line-clamp-2 leading-tight">
              {assignment.title}
            </CardTitle>
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardHeader>
          
          <CardContent className="p-3 pt-2">
            <div className="flex items-center text-xs font-medium text-muted-foreground">
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 opacity-70" />
              <span>
                {new Date(assignment.due_date).toLocaleDateString(undefined, { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}