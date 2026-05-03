import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListWorkspacesQueryKey,
  useCreateWorkspace,
  useListWorkspaces,
} from "~/api/workspaces/workspaces";
import { API_FETCH_OPTIONS } from "~/lib/api-client";
import { getLastWorkspaceId, setLastWorkspaceId } from "~/lib/workspace-storage";

export const Route = createFileRoute("/_protected/")({
  component: WorkspaceRedirect,
});

function WorkspaceRedirect() {
  const query = useListWorkspaces(
    { limit: 50 },
    { fetch: API_FETCH_OPTIONS, query: { staleTime: 30_000 } },
  );

  if (query.isLoading) {
    return (
      <div className="full-screen-center">
        <p className="helper-text">Loading workspaces…</p>
      </div>
    );
  }

  if (query.data?.status !== 200) {
    return (
      <div className="full-screen-center">
        <p className="helper-text">Could not load workspaces.</p>
      </div>
    );
  }

  const workspaces = query.data.data.data ?? [];

  if (workspaces.length === 0) {
    return <EmptyWorkspaces />;
  }

  const lastId = getLastWorkspaceId();
  const fromStorage = lastId ? workspaces.find((w) => w.id === lastId) : null;

  // fall back to most recently created
  const sorted = [...workspaces].sort((a, b) => {
    const aT = a.created_at ? Date.parse(a.created_at) : 0;
    const bT = b.created_at ? Date.parse(b.created_at) : 0;
    return bT - aT;
  });

  const target = fromStorage ?? sorted[0];

  return <Navigate to="/$workspaceId" params={{ workspaceId: target.id }} />;
}

function EmptyWorkspaces() {
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useCreateWorkspace({
    fetch: API_FETCH_OPTIONS,
    mutation: {
      onSuccess: (result) => {
        if (result.status === 201) {
          queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey({ limit: 50 }) });
          setLastWorkspaceId(result.data.id);
          navigate({ to: "/$workspaceId", params: { workspaceId: result.data.id } });
        }
      },
    },
  });

  return (
    <div className="full-screen-center">
      <div className="card-soft empty-state">
        <h1>No workspaces yet</h1>
        <p className="helper-text">Create your first workspace to get started.</p>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed || mutation.isPending) return;
            mutation.mutate({ data: { name: trimmed } });
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
          />
          <button type="submit" disabled={mutation.isPending || !name.trim()}>
            {mutation.isPending ? "Creating…" : "Create"}
          </button>
        </form>
      </div>
    </div>
  );
}
