import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreatePage } from "@/api/pages/pages";
import { PageBaseCreateType } from "@/api/model/pageBaseCreateType";
import { PagePropertiesAssignmentStatus } from "@/api/model/pagePropertiesAssignmentStatus";
import { PagePropertiesAssignmentType } from "@/api/model/pagePropertiesAssignmentType";
import { PagePropertiesCourseType } from "@/api/model/pagePropertiesCourseType";
import { PagePropertiesFolderType } from "@/api/model/pagePropertiesFolderType";
import { PagePropertiesNoteType } from "@/api/model/pagePropertiesNoteType";
import type { TreeNode } from "@/hooks/use-workspace-tree";
import { API_FETCH_OPTIONS } from "@/lib/api-client";
import {
  allowedChildren,
  defaultIconForType,
  defaultPropertiesForType,
  type PageType,
} from "@/lib/page-hierarchy";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

function iconForNode(node: TreeNode) {
  return node.icon ?? defaultIconForType(node.type);
}

function nodeLabel(node: TreeNode) {
  return node.title?.trim() || "Untitled";
}

function PageNode({
  node,
  onCreateChild,
}: {
  node: TreeNode;
  onCreateChild: (parentId: string | null, parentType: PageType | null) => void;
}) {
  const icon = iconForNode(node);
  const label = nodeLabel(node);
  const canCreateChild = allowedChildren(node.type ?? "folder").length > 0;

  if (node.children.length > 0) {
    return (
      <Collapsible asChild className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton>
              <span className="mr-2 text-base">{icon}</span>
              <span className="truncate">{label}</span>
              <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          {canCreateChild ? (
            <SidebarMenuAction
              showOnHover
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onCreateChild(node.id ?? null, node.type ?? null);
              }}
            >
              <PlusIcon />
              <span className="sr-only">Add page</span>
            </SidebarMenuAction>
          ) : null}
          <CollapsibleContent>
            <SidebarMenuSub>
              {node.children.map((child, index) => (
                <PageSubNode
                  key={child.id ?? child.title ?? String(index)}
                  node={child}
                  onCreateChild={onCreateChild}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton type="button">
        <span className="mr-2 text-base">{icon}</span>
        <span className="truncate">{label}</span>
      </SidebarMenuButton>
      {canCreateChild ? (
        <SidebarMenuAction
          showOnHover
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onCreateChild(node.id ?? null, node.type ?? null);
          }}
        >
          <PlusIcon />
          <span className="sr-only">Add page</span>
        </SidebarMenuAction>
      ) : null}
    </SidebarMenuItem>
  );
}

function PageSubActionButton({
  onClick,
}: {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      <PlusIcon className="size-3.5" />
      <span className="sr-only">Add page</span>
    </button>
  );
}

function PageSubNode({
  node,
  onCreateChild,
}: {
  node: TreeNode;
  onCreateChild: (parentId: string | null, parentType: PageType | null) => void;
}) {
  const icon = iconForNode(node);
  const label = nodeLabel(node);
  const canCreateChild = allowedChildren(node.type ?? "folder").length > 0;

  if (node.children.length > 0) {
    return (
      <Collapsible asChild className="group/collapsible">
        <SidebarMenuSubItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuSubButton>
              <span className="mr-2 text-base">{icon}</span>
              <span className="truncate">{label}</span>
              <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuSubButton>
          </CollapsibleTrigger>
          {canCreateChild ? (
            <PageSubActionButton
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onCreateChild(node.id ?? null, node.type ?? null);
              }}
            />
          ) : null}
          <CollapsibleContent>
            <SidebarMenuSub>
              {node.children.map((child, index) => (
                <PageSubNode
                  key={child.id ?? child.title ?? String(index)}
                  node={child}
                  onCreateChild={onCreateChild}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuSubItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton type="button">
        <span className="mr-2 text-base">{icon}</span>
        <span className="truncate">{label}</span>
      </SidebarMenuSubButton>
      {canCreateChild ? (
        <PageSubActionButton
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onCreateChild(node.id ?? null, node.type ?? null);
          }}
        />
      ) : null}
    </SidebarMenuSubItem>
  );
}

export function NavPages({
  nodes,
  hasWorkspace,
  isLoading,
  isError,
  workspaceId,
}: {
  nodes: TreeNode[];
  hasWorkspace: boolean;
  isLoading: boolean;
  isError: boolean;
  workspaceId: string | null;
}) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [parentType, setParentType] = useState<PageType | null>(null);
  const [pageType, setPageType] = useState<PageType>("folder");
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("");
  const [folderColor, setFolderColor] = useState("");
  const [courseSubject, setCourseSubject] = useState("");
  const [courseInstructor, setCourseInstructor] = useState("");
  const [courseSemester, setCourseSemester] = useState("");
  const [courseCredits, setCourseCredits] = useState("");
  const [courseStartDate, setCourseStartDate] = useState("");
  const [courseEndDate, setCourseEndDate] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState<string>(
    PagePropertiesAssignmentStatus.todo,
  );
  const [assignmentDueDate, setAssignmentDueDate] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [noteCoverImage, setNoteCoverImage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createPageMutation = useCreatePage({
    fetch: API_FETCH_OPTIONS,
  });
  const folderNodes = useMemo(() => nodes.filter((node) => node.type === "folder"), [nodes]);
  const allowedTypes = useMemo(() => allowedChildren(parentType), [parentType]);

  const openCreateDialog = (nextParentId: string | null, nextParentType: PageType | null) => {
    const nextAllowed = allowedChildren(nextParentType);
    setParentId(nextParentId);
    setParentType(nextParentType);
    setPageType(nextAllowed[0] ?? "folder");
    setDialogOpen(true);
  };

  const resetFormState = () => {
    setParentId(null);
    setParentType(null);
    setTitle("");
    setIcon("");
    setFolderColor("");
    setCourseSubject("");
    setCourseInstructor("");
    setCourseSemester("");
    setCourseCredits("");
    setCourseStartDate("");
    setCourseEndDate("");
    setAssignmentStatus(PagePropertiesAssignmentStatus.todo);
    setAssignmentDueDate("");
    setNoteTags("");
    setNoteCoverImage("");
    setErrorMessage(null);
  };

  const buildProperties = (type: PageType) => {
    const defaults = defaultPropertiesForType(type);
    if (type === "folder") {
      return {
        ...(defaults ?? { type: PagePropertiesFolderType.folder }),
        type: PagePropertiesFolderType.folder,
        ...(folderColor.trim() ? { color: folderColor.trim() } : {}),
      };
    }
    if (type === "course") {
      const credits = Number(courseCredits);
      return {
        ...(defaults ?? { type: PagePropertiesCourseType.course }),
        type: PagePropertiesCourseType.course,
        ...(courseSubject.trim() ? { subject: courseSubject.trim() } : {}),
        ...(courseInstructor.trim() ? { instructor: courseInstructor.trim() } : {}),
        ...(courseSemester.trim() ? { semester: courseSemester.trim() } : {}),
        ...(Number.isFinite(credits) && courseCredits.trim() ? { credits } : {}),
        ...(courseStartDate.trim() ? { start_date: courseStartDate.trim() } : {}),
        ...(courseEndDate.trim() ? { end_date: courseEndDate.trim() } : {}),
      };
    }
    if (type === "assignment") {
      return {
        ...(defaults ?? { type: PagePropertiesAssignmentType.assignment }),
        type: PagePropertiesAssignmentType.assignment,
        ...(assignmentStatus ? { status: assignmentStatus } : {}),
        ...(assignmentDueDate.trim() ? { due_date: assignmentDueDate.trim() } : {}),
      };
    }
    return {
      ...(defaults ?? { type: PagePropertiesNoteType.note }),
      type: PagePropertiesNoteType.note,
      ...(noteTags.trim()
        ? {
            tags: noteTags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          }
        : {}),
      ...(noteCoverImage.trim() ? { cover_image: noteCoverImage.trim() } : {}),
    };
  };

  const handleCreatePage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspaceId) {
      setErrorMessage("Select a workspace first.");
      return;
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage("Title is required.");
      return;
    }
    if (!allowedTypes.includes(pageType)) {
      setErrorMessage("Select a valid page type.");
      return;
    }

    setErrorMessage(null);
    createPageMutation.mutate(
      {
        data: {
          workspace_id: workspaceId,
          parent_id: parentId ?? undefined,
          title: trimmedTitle,
          type: PageBaseCreateType[pageType],
          icon: icon.trim() || defaultIconForType(pageType),
          properties: buildProperties(pageType),
        },
      },
      {
        onSuccess: (response) => {
          if (response.status !== 201) {
            setErrorMessage("Failed to create page.");
            return;
          }
          queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
          setDialogOpen(false);
          resetFormState();
        },
        onError: () => {
          setErrorMessage("Failed to create page.");
        },
      },
    );
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Pages</SidebarGroupLabel>
      <SidebarGroupAction
        onClick={() => openCreateDialog(null, null)}
        disabled={!hasWorkspace}
        className="disabled:opacity-50"
      >
        <PlusIcon />
        <span className="sr-only">New page</span>
      </SidebarGroupAction>
      <SidebarMenu>
        {isLoading && (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70">
              Loading pages...
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        {!isLoading && isError && (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70">
              Failed to load pages
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        {!isLoading && !isError && !hasWorkspace && (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70">
              Select a workspace to view pages
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        {!isLoading &&
          !isError &&
          hasWorkspace &&
          folderNodes.map((node, index) => (
            <PageNode
              key={node.id ?? node.title ?? String(index)}
              node={node}
              onCreateChild={openCreateDialog}
            />
          ))}
      </SidebarMenu>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetFormState();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New page</DialogTitle>
            <DialogDescription>Fill in the details for your new page.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={handleCreatePage}>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title"
              autoFocus
            />
            <Input
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              placeholder="Icon (emoji or URL)"
            />
            <select
              value={pageType}
              onChange={(event) => setPageType(event.target.value as PageType)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {allowedTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {pageType === "folder" ? (
              <Input
                value={folderColor}
                onChange={(event) => setFolderColor(event.target.value)}
                placeholder="Folder color (hex)"
              />
            ) : null}
            {pageType === "course" ? (
              <>
                <Input
                  value={courseSubject}
                  onChange={(event) => setCourseSubject(event.target.value)}
                  placeholder="Subject"
                />
                <Input
                  value={courseInstructor}
                  onChange={(event) => setCourseInstructor(event.target.value)}
                  placeholder="Instructor"
                />
                <Input
                  value={courseSemester}
                  onChange={(event) => setCourseSemester(event.target.value)}
                  placeholder="Semester"
                />
                <Input
                  value={courseCredits}
                  onChange={(event) => setCourseCredits(event.target.value)}
                  placeholder="Credits"
                />
                <Input
                  value={courseStartDate}
                  onChange={(event) => setCourseStartDate(event.target.value)}
                  placeholder="Start date"
                />
                <Input
                  value={courseEndDate}
                  onChange={(event) => setCourseEndDate(event.target.value)}
                  placeholder="End date"
                />
              </>
            ) : null}
            {pageType === "assignment" ? (
              <>
                <select
                  value={assignmentStatus}
                  onChange={(event) => setAssignmentStatus(event.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  {Object.values(PagePropertiesAssignmentStatus).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <Input
                  value={assignmentDueDate}
                  onChange={(event) => setAssignmentDueDate(event.target.value)}
                  placeholder="Due date"
                />
              </>
            ) : null}
            {pageType === "note" ? (
              <>
                <Input
                  value={noteTags}
                  onChange={(event) => setNoteTags(event.target.value)}
                  placeholder="Tags (comma-separated)"
                />
                <Input
                  value={noteCoverImage}
                  onChange={(event) => setNoteCoverImage(event.target.value)}
                  placeholder="Cover image URL"
                />
              </>
            ) : null}
            {errorMessage ? <div className="text-xs text-destructive">{errorMessage}</div> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPageMutation.isPending}>
                {createPageMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarGroup>
  );
}
