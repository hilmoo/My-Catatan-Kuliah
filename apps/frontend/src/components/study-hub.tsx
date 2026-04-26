import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    getListPagesQueryKey,
    useCreatePage,
    useListPages,
} from "~/api/pages/pages";
import {
    getListWorkspacesQueryKey,
    useCreateWorkspace,
    useListWorkspaces,
} from "~/api/workspaces/workspaces";
import { ListPagesType } from "~/api/model/listPagesType";
import Tiptap from "~/Tiptap";

const API_FETCH_OPTIONS: RequestInit = {
    credentials: "include",
};

type PageType = keyof typeof ListPagesType;

const pageTypeOrder: PageType[] = ["folder", "course", "assignment", "note"];

function titleFromType(type: PageType) {
    switch (type) {
        case "folder":
            return "Folders";
        case "course":
            return "Courses";
        case "assignment":
            return "Assignments";
        case "note":
            return "Notes";
        default:
            return "Pages";
    }
}

function defaultPropertiesForType(type: PageType) {
    if (type === "assignment") {
        return { status: "todo" };
    }

    if (type === "course") {
        return { semester: "Current semester" };
    }

    if (type === "note") {
        return { tags: ["kuliah"] };
    }

    if (type === "folder") {
        return { color: "teal" };
    }

    return undefined;
}

export function StudyHub() {
    const queryClient = useQueryClient();
    const [workspaceName, setWorkspaceName] = useState("");
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const [newPageTitle, setNewPageTitle] = useState("");
    const [newPageIcon, setNewPageIcon] = useState("📘");
    const [pageType, setPageType] = useState<PageType>("note");
    const [activeBoardType, setActiveBoardType] = useState<PageType>("note");
    const [activeEditorPageId, setActiveEditorPageId] = useState<string | null>(null);

    const workspacesQuery = useListWorkspaces(
        { limit: 20 },
        {
            fetch: API_FETCH_OPTIONS,
            query: {
                staleTime: 30_000,
            },
        },
    );

    const workspaces = useMemo(() => {
        if (workspacesQuery.data?.status !== 200) {
            return [];
        }
        return workspacesQuery.data.data.data ?? [];
    }, [workspacesQuery.data]);

    const effectiveWorkspaceId = selectedWorkspaceId ?? workspaces[0]?.id ?? null;

    const folderQuery = useListPages(
        {
            type: ListPagesType.folder,
            workspace_id: effectiveWorkspaceId ?? undefined,
            limit: 50,
        },
        {
            fetch: API_FETCH_OPTIONS,
            query: {
                enabled: !!effectiveWorkspaceId,
            },
        },
    );

    const courseQuery = useListPages(
        {
            type: ListPagesType.course,
            workspace_id: effectiveWorkspaceId ?? undefined,
            limit: 50,
        },
        {
            fetch: API_FETCH_OPTIONS,
            query: {
                enabled: !!effectiveWorkspaceId,
            },
        },
    );

    const assignmentQuery = useListPages(
        {
            type: ListPagesType.assignment,
            workspace_id: effectiveWorkspaceId ?? undefined,
            limit: 50,
        },
        {
            fetch: API_FETCH_OPTIONS,
            query: {
                enabled: !!effectiveWorkspaceId,
            },
        },
    );

    const noteQuery = useListPages(
        {
            type: ListPagesType.note,
            workspace_id: effectiveWorkspaceId ?? undefined,
            limit: 50,
        },
        {
            fetch: API_FETCH_OPTIONS,
            query: {
                enabled: !!effectiveWorkspaceId,
            },
        },
    );

    const pageMap = {
        folder: folderQuery.data?.status === 200 ? (folderQuery.data.data.data ?? []) : [],
        course: courseQuery.data?.status === 200 ? (courseQuery.data.data.data ?? []) : [],
        assignment:
            assignmentQuery.data?.status === 200 ? (assignmentQuery.data.data.data ?? []) : [],
        note: noteQuery.data?.status === 200 ? (noteQuery.data.data.data ?? []) : [],
    };

    useEffect(() => {
        const notePages = pageMap.note;

        if (!notePages.length) {
            setActiveEditorPageId(null);
            return;
        }

        const stillExists = notePages.some((page) => page.id === activeEditorPageId);
        if (!stillExists) {
            setActiveEditorPageId(notePages[0]?.id ?? null);
        }
    }, [activeEditorPageId, pageMap.note]);

    const createWorkspaceMutation = useCreateWorkspace({
        fetch: API_FETCH_OPTIONS,
        mutation: {
            onSuccess: (result) => {
                if (result.status === 201) {
                    setWorkspaceName("");
                    setSelectedWorkspaceId(result.data.id);
                    queryClient.invalidateQueries({
                        queryKey: getListWorkspacesQueryKey({ limit: 20 }),
                    });
                }
            },
        },
    });

    const createPageMutation = useCreatePage({
        fetch: API_FETCH_OPTIONS,
        mutation: {
            onSuccess: () => {
                setNewPageTitle("");
                const queryKeys = pageTypeOrder.map((type) =>
                    getListPagesQueryKey({
                        type: ListPagesType[type],
                        workspace_id: effectiveWorkspaceId ?? undefined,
                        limit: 50,
                    }),
                );

                for (const key of queryKeys) {
                    queryClient.invalidateQueries({ queryKey: key });
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

    const handleCreatePage = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const title = newPageTitle.trim();
        if (!effectiveWorkspaceId || !title || createPageMutation.isPending) {
            return;
        }

        createPageMutation.mutate({
            data: {
                workspace_id: effectiveWorkspaceId,
                title,
                type: pageType,
                icon: newPageIcon.trim() || undefined,
                properties: defaultPropertiesForType(pageType),
            },
        });
    };

    return (
        <main className="study-hub-root">
            <section className="study-hub-hero">
                <p className="study-kicker">My Catatan Kuliah</p>
                <h1>Academic Workspace</h1>
                <p>
                    Organize folders, courses, assignments, and notes in one place. Notes can be
                    drafted directly with the editor while your API data stays in sync.
                </p>
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
                        <h2>Knowledge Board</h2>
                        <span>{effectiveWorkspaceId ? "Connected" : "Not selected"}</span>
                    </div>

                    <form onSubmit={handleCreatePage} className="inline-form multi">
                        <input
                            value={newPageTitle}
                            onChange={(event) => setNewPageTitle(event.target.value)}
                            placeholder="Page title"
                            aria-label="Page title"
                        />
                        <input
                            value={newPageIcon}
                            onChange={(event) => setNewPageIcon(event.target.value)}
                            placeholder="Icon"
                            aria-label="Page icon"
                        />
                        <select
                            value={pageType}
                            onChange={(event) => setPageType(event.target.value as PageType)}
                            aria-label="Page type"
                        >
                            {pageTypeOrder.map((type) => (
                                <option key={type} value={type}>
                                    {titleFromType(type)}
                                </option>
                            ))}
                        </select>
                        <button type="submit" disabled={createPageMutation.isPending || !effectiveWorkspaceId}>
                            {createPageMutation.isPending ? "Saving..." : "Add page"}
                        </button>
                    </form>

                    <div className="chip-row">
                        {pageTypeOrder.map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setActiveBoardType(type)}
                                className={`chip ${activeBoardType === type ? "active" : ""}`}
                            >
                                {titleFromType(type)} ({pageMap[type].length})
                            </button>
                        ))}
                    </div>

                    <div className="stack-list">
                        {pageMap[activeBoardType].map((page) => (
                            <button
                                key={page.id}
                                type="button"
                                onClick={() => {
                                    if (activeBoardType === "note") {
                                        setActiveEditorPageId(page.id ?? null);
                                    }
                                }}
                                className={`page-row ${activeEditorPageId === page.id ? "active" : ""}`}
                            >
                                <div>
                                    <h3>
                                        {page.icon ? `${page.icon} ` : ""}
                                        {page.title || "Untitled"}
                                    </h3>
                                    <p>ID: {page.id}</p>
                                </div>
                                <small>{activeBoardType}</small>
                            </button>
                        ))}

                        {effectiveWorkspaceId && pageMap[activeBoardType].length === 0 ? (
                            <p className="helper-text">No {activeBoardType} in this workspace yet.</p>
                        ) : null}
                        {!effectiveWorkspaceId ? (
                            <p className="helper-text">Select a workspace to load pages.</p>
                        ) : null}
                    </div>
                </section>

                <section className="panel card-soft editor-panel">
                    <div className="panel-head">
                        <h2>Note Editor</h2>
                        <span>TipTap</span>
                    </div>
                    <p className="helper-text">
                        Live collaborative page: {activeEditorPageId ? activeEditorPageId : "none selected"}
                    </p>
                    <div className="editor-wrap">
                        <Tiptap collaborative pageId={activeEditorPageId} />
                    </div>
                </section>
            </section>

            <section className="status-strip card-soft">
                <div>
                    <strong>Workspaces API</strong>
                    <span>{workspacesQuery.isError ? "error" : "ok"}</span>
                </div>
                <div>
                    <strong>Pages API</strong>
                    <span>
                        {folderQuery.isError || courseQuery.isError || assignmentQuery.isError || noteQuery.isError
                            ? "error"
                            : "ok"}
                    </span>
                </div>
                <div>
                    <strong>Auth</strong>
                    <a href="/api/auth/oauth/google">Sign in with Google</a>
                </div>
            </section>
        </main>
    );
}
