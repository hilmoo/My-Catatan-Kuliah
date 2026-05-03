import { Link } from "@tanstack/react-router";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { PageTree } from "./page-tree";

interface Props {
  workspaceId: string;
}

export function Sidebar({ workspaceId }: Props) {
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-brand">
        <Link to="/$workspaceId" params={{ workspaceId }} className="brand-link">
          <span className="brand-dot" />
          <strong>Catatan Kuliah</strong>
        </Link>
      </div>

      <WorkspaceSwitcher currentWorkspaceId={workspaceId} />

      <PageTree workspaceId={workspaceId} />
    </aside>
  );
}
