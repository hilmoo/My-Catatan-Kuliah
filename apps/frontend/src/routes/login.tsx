import { getGetCurrentUserQueryOptions } from "@/api/auth/auth";
import { LoginForm } from "@/components/login-form";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const user = await queryClient.ensureQueryData(getGetCurrentUserQueryOptions());
    if (user.status === 200) {
      throw Route.redirect({ to: "/" });
    }
  },
});

function RouteComponent() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
