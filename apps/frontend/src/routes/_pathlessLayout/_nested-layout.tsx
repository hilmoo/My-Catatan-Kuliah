import { Link, Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_pathlessLayout/_nested-layout")({
  component: LayoutComponent,
});

function LayoutComponent() {
  return (
    <div>
      <div>Assignment workspace</div>
      <div className="flex gap-2 border-b">
        <Link
          to="/route-a"
          activeProps={{
            className: "font-bold",
          }}
        >
          Kanban board
        </Link>
        <Link
          to="/route-b"
          search={{ assignmentId: undefined }}
          activeProps={{
            className: "font-bold",
          }}
        >
          Assignment detail
        </Link>
      </div>
      <div>
        <Outlet />
      </div>
    </div>
  );
}
