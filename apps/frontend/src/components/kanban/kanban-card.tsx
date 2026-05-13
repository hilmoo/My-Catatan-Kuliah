import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { AssignmentsResponse } from "@/api/model";
import { Link } from "@tanstack/react-router";
import { CalendarIcon, GripVertical, MoreVertical, ArrowUp, ArrowDown } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSidebar } from "../ui/sidebar";
import { AssignmentsAssignmentStatus } from "@/api/model/assignmentsAssignmentStatus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface KanbanCardProps {
  assignment: AssignmentsResponse;
  isOverlay?: boolean;
  onMove?: (id: string, status: AssignmentsAssignmentStatus) => void;
  onReorder?: (id: string, direction: "up" | "down") => void;
}

export function KanbanCard({ assignment, isOverlay, onMove, onReorder }: KanbanCardProps) {
  const { isMobile } = useSidebar();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: assignment.id,
    disabled: isMobile,
    data: {
      type: "Assignment",
      assignment,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const moveOptions = [
    { status: AssignmentsAssignmentStatus.Todo, label: "To Do" },
    { status: AssignmentsAssignmentStatus.InProgress, label: "In Progress" },
    { status: AssignmentsAssignmentStatus.Done, label: "Done" },
  ].filter((opt) => opt.status !== assignment.status);

  if (isDragging && !isOverlay) {
    return (
      <div ref={setNodeRef} style={style} className="mb-3 opacity-30 grayscale">
        <div className="rounded-lg border-2 border-dashed border-primary/20 h-[100px] w-full" />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`mb-3 relative group ${
        isMobile ? "" : "cursor-grab active:cursor-grabbing"
      } ${isOverlay ? "z-50 shadow-2xl" : ""}`}
    >
      <Link
        to="/c/$courseId/a/$assignmentId"
        params={{
          courseId: assignment.course_id,
          assignmentId: assignment.id,
        }}
        className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        onClick={(e) => {
          // Prevent link navigation if we were dragging
          if (isDragging) {
            e.preventDefault();
          }
        }}
      >
        <Card className="w-full bg-background dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 group-hover:-translate-y-0.5">
          <CardHeader
            className="p-3 pb-1 flex flex-row items-start justify-between gap-2 space-y-0"
            {...(isMobile ? {} : listeners)}
          >
            <CardTitle className="text-sm font-semibold line-clamp-2 leading-tight">
              {assignment.title}
            </CardTitle>
            {isMobile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-8 w-8 p-0 -mr-1"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Move assignment</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Reorder</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onReorder?.(assignment.id, "up");
                    }}
                  >
                    <ArrowUp className="mr-2 h-4 w-4" />
                    Move Up
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onReorder?.(assignment.id, "down");
                    }}
                  >
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Move Down
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Move to...</DropdownMenuLabel>
                  {moveOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.status}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onMove?.(assignment.id, option.status);
                      }}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </CardHeader>

          <CardContent className="p-3 pt-2">
            <div className="flex items-center text-xs font-medium text-muted-foreground">
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 opacity-70" />
              <span>
                {new Date(assignment.due_date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
