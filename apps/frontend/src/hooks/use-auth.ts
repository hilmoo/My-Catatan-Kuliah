import { useListWorkspaces } from "~/api/workspaces/workspaces";
import { API_FETCH_OPTIONS } from "~/lib/api-client";

export type AuthState = "loading" | "authenticated" | "unauthenticated" | "error";

export function useAuth(): { state: AuthState; isLoading: boolean } {
  const query = useListWorkspaces(
    { limit: 1 },
    {
      fetch: API_FETCH_OPTIONS,
      query: {
        retry: false,
        staleTime: 60_000,
      },
    },
  );

  if (query.isLoading) return { state: "loading", isLoading: true };

  if (query.data?.status === 200) return { state: "authenticated", isLoading: false };

  // Any non-2xx (including 401/403) shows up as isError because redaxios throws.
  if (query.isError) return { state: "unauthenticated", isLoading: false };

  return { state: "error", isLoading: false };
}
