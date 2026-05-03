import { Link } from "@tanstack/react-router";
import { useWorkspaceTree, type TreeNode } from "~/hooks/use-workspace-tree";
import {
  ALL_PAGE_TYPES,
  defaultIconForType,
  PAGE_TYPE_PLURAL,
  type PageType,
} from "~/lib/page-hierarchy";

interface Props {
  workspaceId: string;
}

export function WorkspaceDashboard({ workspaceId }: Props) {
  const { tree, flatById, isLoading } = useWorkspaceTree(workspaceId);

  const grouped: Record<PageType, TreeNode[]> = {
    folder: [],
    course: [],
    assignment: [],
    note: [],
  };
  for (const n of flatById.values()) grouped[n.type].push(n);

  return (
    <div className="workspace-dashboard">
      <header className="dashboard-header">
        <p className="study-kicker">Workspace</p>
        <h1>Overview</h1>
        <p className="dashboard-sub">
          {isLoading ? "Loading…" : `${flatById.size} pages across ${tree.length} top-level items.`}
        </p>
      </header>

      <section className="dashboard-grid">
        {ALL_PAGE_TYPES.map((type) => (
          <div key={type} className="dashboard-card card-soft">
            <div className="dashboard-card-head">
              <h2>
                {defaultIconForType(type)} {PAGE_TYPE_PLURAL[type]}
              </h2>
              <span>{grouped[type].length}</span>
            </div>
            <ul className="dashboard-card-list">
              {grouped[type].slice(0, 6).map((node) => (
                <li key={node.id}>
                  <Link to="/pages/$pageId" params={{ pageId: node.id ?? "" }}>
                    <span>{node.icon || defaultIconForType(type)}</span>
                    <span className="truncate">{node.title || "Untitled"}</span>
                  </Link>
                </li>
              ))}
              {grouped[type].length === 0 && (
                <li className="helper-text">None yet.</li>
              )}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
