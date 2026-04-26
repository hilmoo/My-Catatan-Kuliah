import { Link, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { QueryClient } from "@tanstack/react-query";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div>
        <p>This is the notFoundComponent configured on root route</p>
        
        <Link to="/">Start Over</Link>
      </div>
    );
  },
});

function RootComponent() {
  return (
    <>
      <header className="app-topbar">
        <div className="brand">
          <span className="brand-dot" />
          <strong>My Catatan Kuliah</strong>
        </div>
        <nav className="top-links">
        <Link
          to="/"
          activeProps={{
            className: "is-active",
          }}
          activeOptions={{ exact: true }}
        >
          Dashboard
        </Link>{" "}
        <Link
          to="/tiptap"
          activeProps={{
            className: "is-active",
          }}
        >
          Editor Lab
        </Link>{" "}
        </nav>
      </header>
      <Outlet />
      <ReactQueryDevtools buttonPosition="top-right" />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
