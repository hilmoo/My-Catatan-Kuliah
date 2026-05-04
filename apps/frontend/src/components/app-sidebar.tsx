"use client";

import * as React from "react";

import { NavPages } from "@/components/nav-pages";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useGetCurrentUser } from "@/api/auth/auth";
import { useListWorkspaces } from "@/api/workspaces/workspaces";
import { useWorkspaceTree } from "@/hooks/use-workspace-tree";
import { API_FETCH_OPTIONS } from "@/lib/api-client";
import {
  clearLastWorkspaceId,
  getLastWorkspaceId,
  setLastWorkspaceId,
} from "@/lib/workspace-storage";
import { useNavigate } from "@tanstack/react-router";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const workspacesQuery = useListWorkspaces(undefined, {
    fetch: API_FETCH_OPTIONS,
  });
  const userQuery = useGetCurrentUser({
    fetch: API_FETCH_OPTIONS,
  });
  const navigate = useNavigate();

  const [activeWorkspaceId, setActiveWorkspaceId] = React.useState<string | null>(() =>
    getLastWorkspaceId(),
  );

  const workspaces = React.useMemo(() => {
    if (workspacesQuery.data?.status !== 200) return [];
    return workspacesQuery.data.data.data ?? [];
  }, [workspacesQuery.data]);

  const hasWorkspaceError =
    workspacesQuery.isError || (!!workspacesQuery.data && workspacesQuery.data.status !== 200);

  React.useEffect(() => {
    if (workspacesQuery.isLoading) return;
    if (workspaces.length === 0) {
      if (activeWorkspaceId) {
        setActiveWorkspaceId(null);
        clearLastWorkspaceId();
      }
      return;
    }

    const exists = activeWorkspaceId
      ? workspaces.some((workspace) => workspace.id === activeWorkspaceId)
      : false;
    if (!exists) {
      const nextId = workspaces[0].id;
      setActiveWorkspaceId(nextId);
      setLastWorkspaceId(nextId);
    }
  }, [workspacesQuery.isLoading, workspaces, activeWorkspaceId]);

  const handleWorkspaceChange = React.useCallback((workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    setLastWorkspaceId(workspaceId);
    navigate({ to: "/$workspaceId", params: { workspaceId } });
  }, []);

  const treeQuery = useWorkspaceTree(activeWorkspaceId);

  const user = userQuery.data?.status === 200 ? userQuery.data.data : null;
  const isUnauthenticated = userQuery.data?.status === 401;
  const isUserError =
    userQuery.isError ||
    (!!userQuery.data && userQuery.data.status !== 200 && userQuery.data.status !== 401);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          isLoading={workspacesQuery.isLoading}
          isError={hasWorkspaceError}
          onWorkspaceChange={handleWorkspaceChange}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavPages
          nodes={treeQuery.tree}
          hasWorkspace={!!activeWorkspaceId}
          isLoading={treeQuery.isLoading}
          isError={treeQuery.isError}
          workspaceId={activeWorkspaceId}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={user}
          isLoading={userQuery.isLoading}
          isError={isUserError}
          isUnauthenticated={isUnauthenticated}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
