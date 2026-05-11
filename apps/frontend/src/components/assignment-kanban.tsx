import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  getAssignmentsServiceGetAssignmentQueryKey,
  getAssignmentsServiceListAssignmentsQueryKey,
  useAssignmentsServiceGetAssignment,
  useAssignmentsServiceListAssignments,
  useAssignmentsServiceUpdateAssignment,
} from "@/api/assignments/assignments";
import { AssignmentsAssignmentStatus } from "@/api/model/assignmentsAssignmentStatus";

const API_FETCH_OPTIONS: RequestInit = {
  credentials: "include",
};

const assignmentStatusOrder = [
  AssignmentsAssignmentStatus.Todo,
  AssignmentsAssignmentStatus.InProgress,
  AssignmentsAssignmentStatus.Done,
] as const;

type AssignmentStatus = (typeof assignmentStatusOrder)[number];

type AssignmentCard = {
  id: string;
  title: string;
  dueDate?: string;
  status: AssignmentStatus;
  position?: number;
};

const statusMeta: Record<
  AssignmentStatus,
  {
    label: string;
    accent: string;
    description: string;
  }
> = {
  Todo: {
    label: "To do",
    accent: "kanban-accent-todo",
    description: "Tasks waiting to be started",
  },
  InProgress: {
    label: "In progress",
    accent: "kanban-accent-progress",
    description: "Tasks currently being worked on",
  },
  Done: {
    label: "Done",
    accent: "kanban-accent-done",
    description: "Completed tasks ready to review",
  },
};

function formatDueDate(value?: string) {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function sortAssignments(left: AssignmentCard, right: AssignmentCard) {
  const leftDate = left.dueDate ? new Date(left.dueDate).getTime() : Number.POSITIVE_INFINITY;
  const rightDate = right.dueDate ? new Date(right.dueDate).getTime() : Number.POSITIVE_INFINITY;

  if (leftDate !== rightDate) {
    return leftDate - rightDate;
  }

  return (left.title ?? "").localeCompare(right.title ?? "");
}

export function AssignmentKanban({ courseId }: { courseId: string }) {
  const queryClient = useQueryClient();
  const assignmentsQuery = useAssignmentsServiceListAssignments(courseId, {
    fetch: API_FETCH_OPTIONS,
    query: {
      staleTime: 30_000,
    },
  });

  const assignments = useMemo(() => {
    if (assignmentsQuery.data?.status !== 200) {
      return [] as AssignmentCard[];
    }

    return (assignmentsQuery.data.data ?? []).map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      dueDate: assignment.due_date,
      status: assignment.status,
      position: assignment.position,
    }));
  }, [assignmentsQuery.data]);

  const updateAssignmentMutation = useAssignmentsServiceUpdateAssignment({
    fetch: API_FETCH_OPTIONS,
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getAssignmentsServiceListAssignmentsQueryKey(courseId),
        });
      },
    },
  });

  const columns = assignmentStatusOrder.map((status) => ({
    status,
    cards: assignments.filter((assignment) => assignment.status === status).sort(sortAssignments),
  }));

  const moveAssignment = (assignment: AssignmentCard, nextStatus: AssignmentStatus) => {
    if (!assignment.id || updateAssignmentMutation.isPending) {
      return;
    }

    updateAssignmentMutation.mutate({
      assignmentId: assignment.id,
      data: {
        status: nextStatus,
      },
    });
  };

  return (
    <div className="kanban-shell">
      <header className="kanban-hero">
        <div>
          <p className="study-kicker">Assignment endpoint</p>
          <h1>Kanban board</h1>
          <p>
            Track assignment pages by status, move them through the workflow, and open a focused
            detail view when you need to inspect one task.
          </p>
        </div>
        <div className="kanban-hero-meta">
          <span>{assignments.length} assignments</span>
          <span>{columns[0]?.cards.length ?? 0} waiting</span>
          <span>{columns[1]?.cards.length ?? 0} active</span>
          <span>{columns[2]?.cards.length ?? 0} finished</span>
        </div>
      </header>

      <section className="kanban-board" aria-label="Assignment kanban board">
        {columns.map(({ status, cards }) => {
          const meta = statusMeta[status];

          return (
            <article key={status} className={`kanban-column ${meta.accent}`}>
              <div className="kanban-column-head">
                <div>
                  <p>{meta.label}</p>
                  <span>{meta.description}</span>
                </div>
                <strong>{cards.length}</strong>
              </div>

              <div className="kanban-stack">
                {cards.length === 0 ? <div className="kanban-empty">Nothing here yet.</div> : null}

                {cards.map((assignment) => (
                  <article key={assignment.id} className="kanban-card">
                    <div className="kanban-card-top">
                      <span className="kanban-pill">{formatDueDate(assignment.dueDate)}</span>
                      <Link
                        to="/c/$courseId/a/$assignmentId"
                        params={{ courseId, assignmentId: assignment.id }}
                        className="kanban-detail-link"
                      >
                        Details
                      </Link>
                    </div>
                    <h3>{assignment.title}</h3>
                    <p>Position {assignment.position ?? 0}</p>
                    <div className="kanban-actions">
                      {assignmentStatusOrder.map((candidateStatus) => {
                        if (candidateStatus === assignment.status) {
                          return null;
                        }

                        return (
                          <button
                            key={candidateStatus}
                            type="button"
                            className="kanban-action"
                            onClick={() => moveAssignment(assignment, candidateStatus)}
                            disabled={updateAssignmentMutation.isPending}
                          >
                            Move to {statusMeta[candidateStatus].label}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

export function AssignmentKanbanDetail({
  courseId,
  assignmentId,
}: {
  courseId: string;
  assignmentId?: string;
}) {
  const queryClient = useQueryClient();
  const assignmentQuery = useAssignmentsServiceGetAssignment(assignmentId ?? "", {
    fetch: API_FETCH_OPTIONS,
  });
  const updateAssignmentMutation = useAssignmentsServiceUpdateAssignment({
    fetch: API_FETCH_OPTIONS,
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getAssignmentsServiceListAssignmentsQueryKey(courseId),
        });
        if (assignmentId) {
          queryClient.invalidateQueries({
            queryKey: getAssignmentsServiceGetAssignmentQueryKey(assignmentId),
          });
        }
      },
    },
  });

  const selectedAssignment = useMemo(() => {
    if (assignmentQuery.data?.status !== 200) {
      return null;
    }

    const assignment = assignmentQuery.data.data;

    return {
      id: assignment.id,
      title: assignment.title,
      dueDate: assignment.due_date,
      status: assignment.status,
      position: assignment.position,
    } satisfies AssignmentCard;
  }, [assignmentQuery.data]);

  if (!assignmentId) {
    return (
      <div className="kanban-detail-shell">
        <p className="study-kicker">Assignment detail</p>
        <h1>Choose a card from the board</h1>
        <p>
          Open the Kanban board, pick an assignment, and this page will show the focused status
          controls and summary.
        </p>
        <Link to="/c/$courseId/a" params={{ courseId }} className="kanban-back-link">
          Back to board
        </Link>
      </div>
    );
  }

  if (!selectedAssignment) {
    return (
      <div className="kanban-detail-shell">
        <p className="study-kicker">Assignment detail</p>
        <h1>Assignment not found</h1>
        <p>The selected assignment is no longer available or the URL is outdated.</p>
        <Link to="/c/$courseId/a" params={{ courseId }} className="kanban-back-link">
          Back to board
        </Link>
      </div>
    );
  }

  return (
    <div className="kanban-detail-shell">
      <div className="kanban-detail-head">
        <div>
          <p className="study-kicker">Assignment detail</p>
          <h1>{selectedAssignment.title}</h1>
          <p>
            Current status: <strong>{statusMeta[selectedAssignment.status].label}</strong>
          </p>
        </div>
        <Link to="/c/$courseId/a" params={{ courseId }} className="kanban-back-link">
          Back to board
        </Link>
      </div>

      <div className="kanban-detail-card">
        <div className="kanban-detail-grid">
          <div>
            <span>Due date</span>
            <strong>{formatDueDate(selectedAssignment.dueDate)}</strong>
          </div>
          <div>
            <span>Position</span>
            <strong>{selectedAssignment.position ?? 0}</strong>
          </div>
          <div>
            <span>Assignment id</span>
            <strong>{selectedAssignment.id}</strong>
          </div>
        </div>

        <div className="kanban-detail-statuses">
          {assignmentStatusOrder.map((candidateStatus) => (
            <button
              key={candidateStatus}
              type="button"
              className={`kanban-status-button ${candidateStatus === selectedAssignment.status ? "is-active" : ""}`}
              onClick={() =>
                updateAssignmentMutation.mutate({
                  assignmentId: selectedAssignment.id,
                  data: {
                    status: candidateStatus,
                  },
                })
              }
              disabled={
                updateAssignmentMutation.isPending || candidateStatus === selectedAssignment.status
              }
            >
              {statusMeta[candidateStatus].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}