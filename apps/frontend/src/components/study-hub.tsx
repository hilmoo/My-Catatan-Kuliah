import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  getWorkspacesServiceListWorkspacesQueryKey,
  useWorkspacesServiceCreateWorkspace,
  useWorkspacesServiceListWorkspaces,
} from "@/api/workspaces/workspaces";
import {
  getCoursesServiceListCoursesQueryKey,
  useCoursesServiceCreateCourse,
  useCoursesServiceListCourses,
} from "@/api/courses/courses";
import { useAssignmentsServiceListAssignments } from "@/api/assignments/assignments";
import {
  getNotesServiceListNotesQueryKey,
  useNotesServiceCreateNote,
  useNotesServiceListNotes,
} from "@/api/notes/notes";
import type { AssignmentsResponse } from "@/api/model/assignmentsResponse";
import type { CoursesResponse } from "@/api/model/coursesResponse";
import type { NotesResponse } from "@/api/model/notesResponse";
import type { WorkspacesResponse } from "@/api/model/workspacesResponse";
import Tiptap from "@/Tiptap";

const API_FETCH_OPTIONS: RequestInit = {
  credentials: "include",
};
type BoardType = "assignments" | "notes";

const boardTypeOrder: BoardType[] = ["assignments", "notes"];

function titleFromBoardType(type: BoardType) {
  return type === "assignments" ? "Assignments" : "Notes";
}

export function StudyHub() {
  const queryClient = useQueryClient();
  const [workspaceName, setWorkspaceName] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseInstructor, setNewCourseInstructor] = useState("");
  const [newCourseCredits, setNewCourseCredits] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [activeBoardType, setActiveBoardType] = useState<BoardType>("assignments");
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const workspacesQuery = useWorkspacesServiceListWorkspaces({
    fetch: API_FETCH_OPTIONS,
    query: {
      staleTime: 30_000,
    },
  });

  const workspaces = useMemo<WorkspacesResponse[]>(() => {
    if (workspacesQuery.data?.status !== 200) {
      return [];
    }

    return workspacesQuery.data.data ?? [];
  }, [workspacesQuery.data]);

  const effectiveWorkspaceId = selectedWorkspaceId ?? workspaces[0]?.id ?? null;

  const coursesQuery = useCoursesServiceListCourses(effectiveWorkspaceId ?? "", {
    fetch: API_FETCH_OPTIONS,
    query: {
      enabled: !!effectiveWorkspaceId,
      staleTime: 30_000,
    },
  });

  const courses = useMemo<CoursesResponse[]>(() => {
    if (coursesQuery.data?.status !== 200) {
      return [];
    }

    return coursesQuery.data.data ?? [];
  }, [coursesQuery.data]);

  useEffect(() => {
    if (!courses.length) {
      setActiveCourseId(null);
      return;
    }

    const stillExists = courses.some((course) => course.id === activeCourseId);
    if (!stillExists) {
      setActiveCourseId(courses[0]?.id ?? null);
    }
  }, [activeCourseId, courses]);

  const assignmentsQuery = useAssignmentsServiceListAssignments(activeCourseId ?? "", {
    fetch: API_FETCH_OPTIONS,
    query: {
      enabled: !!activeCourseId,
    },
  });

  const assignments = useMemo<AssignmentsResponse[]>(() => {
    if (assignmentsQuery.data?.status !== 200) {
      return [];
    }

    return assignmentsQuery.data.data ?? [];
  }, [assignmentsQuery.data]);

  const notesQuery = useNotesServiceListNotes(activeCourseId ?? "", {
    fetch: API_FETCH_OPTIONS,
    query: {
      enabled: !!activeCourseId,
    },
  });

  const notes = useMemo<NotesResponse[]>(() => {
    if (notesQuery.data?.status !== 200) {
      return [];
    }

    return notesQuery.data.data ?? [];
  }, [notesQuery.data]);

  useEffect(() => {
    if (!notes.length) {
      setActiveNoteId(null);
      return;
    }

    const stillExists = notes.some((note) => note.id === activeNoteId);
    if (!stillExists) {
      setActiveNoteId(notes[0]?.id ?? null);
    }
  }, [activeNoteId, notes]);

  const createWorkspaceMutation = useWorkspacesServiceCreateWorkspace({
    fetch: API_FETCH_OPTIONS,
    mutation: {
      onSuccess: (result) => {
        if (result.status === 201) {
          setWorkspaceName("");
          setSelectedWorkspaceId(result.data.id);
          queryClient.invalidateQueries({
            queryKey: getWorkspacesServiceListWorkspacesQueryKey(),
          });
        }
      },
    },
  });

  const createCourseMutation = useCoursesServiceCreateCourse({
    fetch: API_FETCH_OPTIONS,
    mutation: {
      onSuccess: (result) => {
        if (result.status === 201) {
          setNewCourseTitle("");
          setNewCourseInstructor("");
          setNewCourseCredits("");
          setActiveCourseId(result.data.id);
          if (effectiveWorkspaceId) {
            queryClient.invalidateQueries({
              queryKey: getCoursesServiceListCoursesQueryKey(effectiveWorkspaceId),
            });
          }
        }
      },
    },
  });

  const createNoteMutation = useNotesServiceCreateNote({
    fetch: API_FETCH_OPTIONS,
    mutation: {
      onSuccess: (result) => {
        if (result.status === 201) {
          setNewNoteTitle("");
          setActiveNoteId(result.data.id);
          if (activeCourseId) {
            queryClient.invalidateQueries({
              queryKey: getNotesServiceListNotesQueryKey(activeCourseId),
            });
          }
        }
      },
    },
  });

  const handleCreateWorkspace = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = workspaceName.trim();
    if (!name || createWorkspaceMutation.isPending) {
      return;
    }

    createWorkspaceMutation.mutate({
      data: { name },
    });
  };

  const handleCreateCourse = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = newCourseTitle.trim();
    const instructor = newCourseInstructor.trim();
    const creditsRaw = newCourseCredits.trim();
    const creditsValue = creditsRaw ? Number(creditsRaw) : undefined;

    if (!effectiveWorkspaceId || !title || !instructor || createCourseMutation.isPending) {
      return;
    }

    if (creditsRaw && !Number.isFinite(creditsValue)) {
      return;
    }

    createCourseMutation.mutate({
      data: {
        workspace_id: effectiveWorkspaceId,
        title,
        instructor,
        credits: creditsValue,
      },
    });
  };

  const handleCreateNote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = newNoteTitle.trim();
    if (!activeCourseId || !title || createNoteMutation.isPending) {
      return;
    }

    createNoteMutation.mutate({
      data: {
        course_id: activeCourseId,
        title,
      },
    });
  };

  return (
    <main className="study-hub-root">
      <section className="study-hub-hero">
        <p className="study-kicker">My Catatan Kuliah</p>
        <h1>Academic Workspace</h1>
        <p>
          Organize folders, courses, assignments, and notes in one place. Notes can be drafted
          directly with the editor while your API data stays in sync.
        </p>
        {activeCourseId ? (
          <Link
            to="/c/$courseId/a"
            params={{ courseId: activeCourseId }}
            className="kanban-detail-link"
            style={{ marginTop: 16 }}
          >
            Open assignment Kanban board
          </Link>
        ) : (
          <span className="helper-text" style={{ marginTop: 16 }}>
            Select a course to open the Kanban board.
          </span>
        )}
      </section>

      <section className="study-hub-grid">
        <aside className="panel card-soft">
          <div className="panel-head">
            <h2>Workspaces</h2>
            <span>{workspaces.length}</span>
          </div>

          <form onSubmit={handleCreateWorkspace} className="inline-form">
            <input
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="New workspace name"
              aria-label="Workspace name"
            />
            <button type="submit" disabled={createWorkspaceMutation.isPending}>
              {createWorkspaceMutation.isPending ? "Saving..." : "Create"}
            </button>
          </form>

          <div className="stack-list">
            {workspaces.map((workspace) => {
              const isActive = workspace.id === effectiveWorkspaceId;

              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => setSelectedWorkspaceId(workspace.id)}
                  className={`workspace-item ${isActive ? "active" : ""}`}
                >
                  <strong>{workspace.name}</strong>
                  <span>{workspace.id.slice(0, 8)}</span>
                </button>
              );
            })}

            {!workspacesQuery.isLoading && workspaces.length === 0 ? (
              <p className="helper-text">No workspace yet. Create one to begin.</p>
            ) : null}
          </div>
        </aside>

        <section className="panel card-soft">
          <div className="panel-head">
            <h2>Courses</h2>
            <span>{effectiveWorkspaceId ? `${courses.length} total` : "Not selected"}</span>
          </div>

          <form onSubmit={handleCreateCourse} className="inline-form multi">
            <input
              value={newCourseTitle}
              onChange={(event) => setNewCourseTitle(event.target.value)}
              placeholder="Course title"
              aria-label="Course title"
            />
            <input
              value={newCourseInstructor}
              onChange={(event) => setNewCourseInstructor(event.target.value)}
              placeholder="Instructor"
              aria-label="Course instructor"
            />
            <input
              value={newCourseCredits}
              onChange={(event) => setNewCourseCredits(event.target.value)}
              placeholder="Credits"
              aria-label="Course credits"
            />
            <button
              type="submit"
              disabled={createCourseMutation.isPending || !effectiveWorkspaceId}
            >
              {createCourseMutation.isPending ? "Saving..." : "Add course"}
            </button>
          </form>

          <div className="chip-row">
            {boardTypeOrder.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveBoardType(type)}
                className={`chip ${activeBoardType === type ? "active" : ""}`}
              >
                {titleFromBoardType(type)}
              </button>
            ))}
          </div>

          <div className="stack-list">
            {courses.map((course) => {
              const isActive = course.id === activeCourseId;
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setActiveCourseId(course.id)}
                  className={`page-row ${isActive ? "active" : ""}`}
                >
                  <div>
                    <h3>{course.title}</h3>
                    <p>{course.instructor}</p>
                  </div>
                  <small>{course.credits ?? 0} SKS</small>
                </button>
              );
            })}

            {effectiveWorkspaceId && courses.length === 0 ? (
              <p className="helper-text">No courses in this workspace yet.</p>
            ) : null}
            {!effectiveWorkspaceId ? (
              <p className="helper-text">Select a workspace to load courses.</p>
            ) : null}
          </div>
        </section>

        <section className="panel card-soft">
          <div className="panel-head">
            <h2>{titleFromBoardType(activeBoardType)}</h2>
            <span>{activeCourseId ? "Connected" : "Select a course"}</span>
          </div>

          <form onSubmit={handleCreateNote} className="inline-form multi">
            <input
              value={newNoteTitle}
              onChange={(event) => setNewNoteTitle(event.target.value)}
              placeholder="New note title"
              aria-label="Note title"
              disabled={!activeCourseId}
            />
            <button type="submit" disabled={createNoteMutation.isPending || !activeCourseId}>
              {createNoteMutation.isPending ? "Saving..." : "Add note"}
            </button>
          </form>

          <div className="stack-list">
            {activeBoardType === "assignments"
              ? assignments.map((assignment) => (
                  <div key={assignment.id} className="page-row">
                    <div>
                      <h3>{assignment.title}</h3>
                      <p>Status: {assignment.status}</p>
                    </div>
                    <small>{assignment.due_date ? "Due" : "No due"}</small>
                  </div>
                ))
              : notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setActiveNoteId(note.id)}
                    className={`page-row ${activeNoteId === note.id ? "active" : ""}`}
                  >
                    <div>
                      <h3>{note.title || "Untitled"}</h3>
                      <p>ID: {note.id}</p>
                    </div>
                    <small>note</small>
                  </button>
                ))}

            {activeCourseId && activeBoardType === "assignments" && assignments.length === 0 ? (
              <p className="helper-text">No assignments for this course yet.</p>
            ) : null}
            {activeCourseId && activeBoardType === "notes" && notes.length === 0 ? (
              <p className="helper-text">No notes for this course yet.</p>
            ) : null}
            {!activeCourseId ? (
              <p className="helper-text">Pick a course to load assignments and notes.</p>
            ) : null}
          </div>
        </section>

        <section className="panel card-soft editor-panel">
          <div className="panel-head">
            <h2>Note Editor</h2>
            <span>TipTap</span>
          </div>
          <p className="helper-text">
            Live collaborative note: {activeNoteId ? activeNoteId : "none selected"}
          </p>
          <div className="editor-wrap">
            <Tiptap collaborative pageId={activeNoteId} />
          </div>
        </section>
      </section>

      <section className="status-strip card-soft">
        <div>
          <strong>Workspaces API</strong>
          <span>{workspacesQuery.isError ? "error" : "ok"}</span>
        </div>
        <div>
          <strong>Courses API</strong>
          <span>{coursesQuery.isError ? "error" : "ok"}</span>
        </div>
        <div>
          <strong>Assignments API</strong>
          <span>{assignmentsQuery.isError ? "error" : "ok"}</span>
        </div>
        <div>
          <strong>Notes API</strong>
          <span>{notesQuery.isError ? "error" : "ok"}</span>
        </div>
        <div>
          <strong>Auth</strong>
          <a href="/api/auth/oauth/google">Sign in with Google</a>
        </div>
      </section>
    </main>
  );
}
