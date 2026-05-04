"use client";

import * as React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateWorkspace, getListWorkspacesQueryKey } from "@/api/workspaces/workspaces";
import { API_FETCH_OPTIONS } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react";

export function TeamSwitcher({
  workspaces,
  activeWorkspaceId,
  isLoading,
  isError,
  onWorkspaceChange,
}: {
  workspaces: {
    id: string;
    name: string;
  }[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
  isError: boolean;
  onWorkspaceChange: (workspaceId: string) => void;
}) {
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [workspaceName, setWorkspaceName] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const createWorkspaceMutation = useCreateWorkspace({
    fetch: API_FETCH_OPTIONS,
  });

  const activeWorkspace = React.useMemo(() => {
    if (!activeWorkspaceId) return workspaces[0];
    return workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0];
  }, [activeWorkspaceId, workspaces]);

  const initials = React.useMemo(() => {
    const name = activeWorkspace?.name ?? "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "W";
    const second = parts.length > 1 ? parts[1][0] : "";
    return `${first}${second}`.toUpperCase();
  }, [activeWorkspace]);

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="text-sidebar-foreground/70" disabled>
            Loading workspaces...
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (isError) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="text-sidebar-foreground/70" disabled>
            Workspaces unavailable
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!activeWorkspace) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="text-sidebar-foreground/70" disabled>
            No workspaces
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const handleCreateWorkspace = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name) {
      setErrorMessage("Workspace name is required.");
      return;
    }

    setErrorMessage(null);
    createWorkspaceMutation.mutate(
      { data: { name } },
      {
        onSuccess: (response) => {
          if (response.status !== 201) {
            setErrorMessage("Failed to create workspace.");
            return;
          }
          const created = response.data;
          if (created?.id) {
            onWorkspaceChange(created.id);
          }
          queryClient.invalidateQueries({
            queryKey: getListWorkspacesQueryKey(),
          });
          setWorkspaceName("");
          setDialogOpen(false);
        },
        onError: () => {
          setErrorMessage("Failed to create workspace.");
        },
      },
    );
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span className="text-xs font-semibold">{initials}</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeWorkspace.name}</span>
                <span className="truncate text-xs">Workspace</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace, index) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => onWorkspaceChange(workspace.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <span className="text-[10px] font-semibold">
                    {workspace.name.trim().charAt(0).toUpperCase() || "W"}
                  </span>
                </div>
                {workspace.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onSelect={(event) => {
                event.preventDefault();
                setDialogOpen(true);
              }}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <PlusIcon className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">Add workspace</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setErrorMessage(null);
            setWorkspaceName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>Give your workspace a short, clear name.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={handleCreateWorkspace}>
            <Input
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="Workspace name"
              autoFocus
            />
            {errorMessage ? <div className="text-xs text-destructive">{errorMessage}</div> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createWorkspaceMutation.isPending}>
                {createWorkspaceMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  );
}
