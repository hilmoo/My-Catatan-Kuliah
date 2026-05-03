import { useMemo } from "react";
import { useListPages } from "~/api/pages/pages";
import { ListPagesType } from "~/api/model/listPagesType";
import type { PageDetail } from "~/api/model/pageDetail";
import { API_FETCH_OPTIONS } from "~/lib/api-client";
import type { PageType } from "~/lib/page-hierarchy";

export interface TreeNode extends PageDetail {
  type: PageType;
  children: TreeNode[];
}

function useTypedPages(workspaceId: string | null, type: PageType) {
  return useListPages(
    {
      type: ListPagesType[type],
      workspace_id: workspaceId ?? undefined,
      limit: 100,
    },
    {
      fetch: API_FETCH_OPTIONS,
      query: {
        enabled: !!workspaceId,
      },
    },
  );
}

export function useWorkspaceTree(workspaceId: string | null) {
  const folderQuery = useTypedPages(workspaceId, "folder");
  const courseQuery = useTypedPages(workspaceId, "course");
  const assignmentQuery = useTypedPages(workspaceId, "assignment");
  const noteQuery = useTypedPages(workspaceId, "note");

  const folderData = folderQuery.data;
  const courseData = courseQuery.data;
  const assignmentData = assignmentQuery.data;
  const noteData = noteQuery.data;

  const tree = useMemo<TreeNode[]>(() => {
    const flat: TreeNode[] = [];

    const push = (data: typeof folderData, type: PageType) => {
      if (data?.status !== 200) return;
      for (const p of data.data.data ?? []) {
        flat.push({ ...p, type, children: [] });
      }
    };

    push(folderData, "folder");
    push(courseData, "course");
    push(assignmentData, "assignment");
    push(noteData, "note");

    const byId = new Map<string, TreeNode>();
    for (const node of flat) {
      if (node.id) byId.set(node.id, node);
    }

    const roots: TreeNode[] = [];
    for (const node of flat) {
      const parentId = node.parent_id;
      const parent = parentId ? byId.get(parentId) : undefined;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortByTitle = (a: TreeNode, b: TreeNode) =>
      (a.title ?? "").localeCompare(b.title ?? "");

    const sortRecursive = (nodes: TreeNode[]) => {
      nodes.sort(sortByTitle);
      for (const n of nodes) sortRecursive(n.children);
    };
    sortRecursive(roots);

    return roots;
  }, [folderData, courseData, assignmentData, noteData]);

  const flatById = useMemo(() => {
    const map = new Map<string, TreeNode>();
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.id) map.set(n.id, n);
        walk(n.children);
      }
    };
    walk(tree);
    return map;
  }, [tree]);

  return {
    tree,
    flatById,
    isLoading:
      folderQuery.isLoading ||
      courseQuery.isLoading ||
      assignmentQuery.isLoading ||
      noteQuery.isLoading,
    isError:
      folderQuery.isError || courseQuery.isError || assignmentQuery.isError || noteQuery.isError,
  };
}
