import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDownIcon, PlusIcon, BuildingIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
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
import {
  useWorkspacesServiceListWorkspaces,
  useWorkspacesServiceCreateWorkspace,
  getWorkspacesServiceListWorkspacesQueryKey,
} from "@/api/workspaces/workspaces";
import { WorkspacesServiceCreateWorkspaceBody } from "@/api/workspaces/workspaces.zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useState } from "react";
import { Link } from "@tanstack/react-router";

interface WorkspaceSwitcherProps {
  workspacesId: string;
}

export function WorkspaceSwitcher({ workspacesId }: WorkspaceSwitcherProps) {
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const { data: workspacesData, isLoading } = useWorkspacesServiceListWorkspaces();
  const createWorkspaceMutation = useWorkspacesServiceCreateWorkspace();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(WorkspacesServiceCreateWorkspaceBody),
    defaultValues: {
      name: "",
    },
  });

  if (workspacesData?.status !== 200) {
    return <div className="p-2">Failed to load workspaces</div>;
  }
  const workspaces = workspacesData?.data || [];
  const activeWorkspace = workspaces.find((w) => w.id === workspacesId);

  const onSubmit = handleSubmit((data) => {
    createWorkspaceMutation.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getWorkspacesServiceListWorkspacesQueryKey(),
          });
          setShowAddDialog(false);
          reset();
        },
      },
    );
  });

  if (isLoading) {
    return <div className="p-2">Loading workspaces...</div>;
  }

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
                <BuildingIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeWorkspace?.name || "Select Workspace"}
                </span>
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
            {workspaces.map((workspace) => (
              <DropdownMenuItem key={workspace.id} asChild className="gap-2 p-2">
                <Link to="/$workspaceId" params={{ workspaceId: workspace.id }}>
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <BuildingIcon className="size-4" />
                  </div>
                  {workspace.name}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onSelect={(e) => {
                e.preventDefault();
                setShowAddDialog(true);
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field>
              <FieldLabel>Workspace Name</FieldLabel>
              <Input {...register("name")} placeholder="Enter workspace name" />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
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
