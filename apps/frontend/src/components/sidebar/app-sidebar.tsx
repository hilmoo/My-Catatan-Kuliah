import { WorkspaceSwitcher } from "@/components/sidebar/workspace-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import { NavWorkspaces } from "./nav-workspaces";
import { NavCourses } from "./nav-courses";
import { CourseSwitcher } from "./courses-switcher";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  workspaceId?: string;
  courseId?: string;
}

export function AppSidebar({ workspaceId, courseId, ...props }: AppSidebarProps) {
  const sidebarContent = () => {
    if (courseId) {
      return (
        <SidebarContent>
          <NavCourses courseId={courseId} />
        </SidebarContent>
      );
    }

    if (workspaceId) {
      return (
        <SidebarContent>
          <NavWorkspaces workspaceId={workspaceId} />
        </SidebarContent>
      );
    }

    return null;
  };

  const sidebarHeader = () => {
    if (courseId) {
      return (
        <SidebarHeader>
          <CourseSwitcher courseId={courseId} />
        </SidebarHeader>
      );
    }

    if (workspaceId) {
      return (
        <SidebarHeader>
          <WorkspaceSwitcher workspacesId={workspaceId} />
        </SidebarHeader>
      );
    }

    return null;
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      {sidebarHeader()}

      {sidebarContent()}

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
