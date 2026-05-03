import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListPagesQueryKey, useCreatePage } from "~/api/pages/pages";
import { ListPagesType } from "~/api/model/listPagesType";
import { API_FETCH_OPTIONS } from "~/lib/api-client";
import {
  ALL_PAGE_TYPES,
  allowedChildren,
  defaultPropertiesForType,
  PAGE_TYPE_LABEL,
  type PageType,
} from "~/lib/page-hierarchy";

interface Props {
  workspaceId: string;
  parentId: string | null;
  parentType: PageType | null;
  onDone: () => void;
  depth?: number;
}

export function CreatePageInline({ workspaceId, parentId, parentType, onDone, depth = 0 }: Props) {
  const allowed = allowedChildren(parentType);
  const [type, setType] = useState<PageType>(allowed[0] ?? "note");
  const [title, setTitle] = useState("");
  const queryClient = useQueryClient();

  const createMutation = useCreatePage({
    fetch: API_FETCH_OPTIONS,
    mutation: {
      onSuccess: () => {
        setTitle("");
        for (const t of ALL_PAGE_TYPES) {
          queryClient.invalidateQueries({
            queryKey: getListPagesQueryKey({
              type: ListPagesType[t],
              workspace_id: workspaceId,
              limit: 100,
            }),
          });
        }
        onDone();
      },
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || createMutation.isPending) return;
    createMutation.mutate({
      data: {
        workspace_id: workspaceId,
        parent_id: parentId ?? undefined,
        title: trimmed,
        type,
        properties: defaultPropertiesForType(type),
      },
    });
  };

  if (allowed.length === 0) return null;

  return (
    <form onSubmit={submit} className="tree-create" style={{ paddingLeft: 6 + depth * 14 }}>
      <select
        value={type}
        onChange={(e) => setType(e.target.value as PageType)}
        aria-label="Page type"
      >
        {allowed.map((t) => (
          <option key={t} value={t}>
            {PAGE_TYPE_LABEL[t]}
          </option>
        ))}
      </select>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        aria-label="Page title"
      />
      <button type="submit" disabled={createMutation.isPending || !title.trim()}>
        {createMutation.isPending ? "..." : "Add"}
      </button>
    </form>
  );
}
