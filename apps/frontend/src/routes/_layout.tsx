import { getAuthGetMeQueryOptions } from "@/api/auth/auth";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout")({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const user = await queryClient.ensureQueryData(getAuthGetMeQueryOptions());

    if (user.status !== 200) {
      throw redirect({ to: "/login" });
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
