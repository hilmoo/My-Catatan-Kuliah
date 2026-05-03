import { useState } from "react";
import { useWorkspaceTree } from "~/hooks/use-workspace-tree";
import { PageTreeNode } from "./page-tree-node";
import { CreatePageInline } from "./create-page-inline";

interface Props {
  workspaceId: string;
}

export function PageTree({ workspaceId }: Props) {
  const { tree, isLoading } = useWorkspaceTree(workspaceId);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="page-tree">
      <div className="page-tree-head">
        <span>Pages</span>
        <button
          type="button"
          className="tree-add"
          onClick={() => setShowCreate((s) => !s)}
          aria-label="Add top-level page"
          title="Add top-level page"
        >
          +
        </button>
      </div>

      {showCreate && (
        <CreatePageInline
          workspaceId={workspaceId}
          parentId={null}
          parentType={null}
          onDone={() => setShowCreate(false)}
        />
      )}

      {isLoading ? (
        <p className="helper-text">Loading…</p>
      ) : tree.length === 0 ? (
        <p className="helper-text">No pages yet. Click + to create one.</p>
      ) : (
        <ul className="tree-root">
          {tree.map((node) => (
            <PageTreeNode key={node.id} node={node} depth={0} workspaceId={workspaceId} />
          ))}
        </ul>
      )}
    </div>
  );
}
