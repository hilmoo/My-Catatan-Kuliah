import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListWorkspacesQueryKey,
  useCreateWorkspace,
  useListWorkspaces,
} from "~/api/workspaces/workspaces";
import { API_FETCH_OPTIONS } from "~/lib/api-client";
import { setLastWorkspaceId } from "~/lib/workspace-storage";

interface Props {
  currentWorkspaceId: string;
}

export function WorkspaceSwitcher({ currentWorkspaceId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const workspacesQuery = useListWorkspaces(
    { limit: 50 },
    { fetch: API_FETCH_OPTIONS, query: { staleTime: 30_000 } },
  );

  const workspaces =
    workspacesQuery.data?.status === 200 ? (workspacesQuery.data.data.data ?? []) : [];

  const current = workspaces.find((w) => w.id === currentWorkspaceId);

  const createMutation = useCreateWorkspace({
    fetch: API_FETCH_OPTIONS,
    mutation: {
      onSuccess: (result) => {
        if (result.status === 201) {
          setName("");
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey({ limit: 50 }) });
          setLastWorkspaceId(result.data.id);
          navigate({ to: "/$workspaceId", params: { workspaceId: result.data.id } });
        }
      },
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || createMutation.isPending) return;
    createMutation.mutate({ data: { name: trimmed } });
  };

  return (
    <div className="ws-switcher">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ws-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ws-switcher-name">{current?.name ?? "Select workspace"}</span>
        <span className="ws-switcher-caret">▾</span>
      </button>

      {open && (
        <div className="ws-switcher-panel">
          <ul className="ws-switcher-list">
            {workspaces.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setLastWorkspaceId(w.id);
                    navigate({ to: "/$workspaceId", params: { workspaceId: w.id } });
                  }}
                  className={`ws-switcher-item ${w.id === currentWorkspaceId ? "active" : ""}`}
                >
                  {w.name}
                </button>
              </li>
            ))}
            {workspaces.length === 0 && !workspacesQuery.isLoading && (
              <li className="ws-switcher-empty">No workspaces yet.</li>
            )}
          </ul>

          <form onSubmit={handleCreate} className="ws-switcher-create">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New workspace"
              aria-label="New workspace name"
            />
            <button type="submit" disabled={createMutation.isPending || !name.trim()}>
              {createMutation.isPending ? "..." : "Add"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
