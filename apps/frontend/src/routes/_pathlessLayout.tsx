import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_pathlessLayout")({
  component: LayoutComponent,
});

function LayoutComponent() {
  return (
    <div className="p-2">
      <div className="border-b">Assignment workspace</div>
      <div>
        <Outlet />
      </div>
    </div>
  );
}