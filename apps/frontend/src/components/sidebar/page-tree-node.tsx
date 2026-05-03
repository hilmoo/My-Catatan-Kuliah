import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import type { TreeNode } from "~/hooks/use-workspace-tree";
import { allowedChildren, defaultIconForType, PAGE_TYPE_LABEL } from "~/lib/page-hierarchy";
import { CreatePageInline } from "./create-page-inline";

interface Props {
  node: TreeNode;
  depth: number;
  workspaceId: string;
}

export function PageTreeNode({ node, depth, workspaceId }: Props) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [showCreate, setShowCreate] = useState(false);
  const params = useParams({ strict: false }) as { pageId?: string };
  const isActive = params.pageId === node.id;

  const hasChildren = node.children.length > 0;
  const childTypes = allowedChildren(node.type);
  const canHaveChildren = childTypes.length > 0;

  return (
    <li className="tree-node">
      <div
        className={`tree-row ${isActive ? "active" : ""}`}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        <button
          type="button"
          className="tree-caret"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Collapse" : "Expand"}
          disabled={!hasChildren}
        >
          {hasChildren ? (expanded ? "▾" : "▸") : "·"}
        </button>

        <Link
          to="/pages/$pageId"
          params={{ pageId: node.id ?? "" }}
          className="tree-link"
          title={`${PAGE_TYPE_LABEL[node.type]}: ${node.title ?? "Untitled"}`}
        >
          <span className="tree-icon">{node.icon || defaultIconForType(node.type)}</span>
          <span className="tree-title">{node.title || "Untitled"}</span>
        </Link>

        {canHaveChildren && (
          <button
            type="button"
            className="tree-add"
            onClick={() => {
              setShowCreate((s) => !s);
              setExpanded(true);
            }}
            aria-label="Add child"
            title="Add child page"
          >
            +
          </button>
        )}
      </div>

      {expanded && (
        <ul className="tree-children">
          {showCreate && (
            <li>
              <CreatePageInline
                workspaceId={workspaceId}
                parentId={node.id ?? null}
                parentType={node.type}
                onDone={() => setShowCreate(false)}
                depth={depth + 1}
              />
            </li>
          )}
          {node.children.map((child) => (
            <PageTreeNode key={child.id} node={child} depth={depth + 1} workspaceId={workspaceId} />
          ))}
        </ul>
      )}
    </li>
  );
}
