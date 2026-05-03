import { createFileRoute, Navigate } from "@tanstack/react-router";
import { GoogleSignInButton } from "~/components/auth/google-sign-in-button";
import { useAuth } from "~/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { state } = useAuth();

  if (state === "authenticated") {
    return <Navigate to="/" />;
  }

  return (
    <main className="login-screen">
      <div className="login-card card-soft">
        <div className="login-brand">
          <span className="brand-dot" />
          <strong>Catatan Kuliah</strong>
        </div>
        <h1>Welcome back</h1>
        <p className="helper-text">
          Sign in to access your folders, courses, assignments, and notes.
        </p>
        <GoogleSignInButton />
      </div>
    </main>
  );
}
