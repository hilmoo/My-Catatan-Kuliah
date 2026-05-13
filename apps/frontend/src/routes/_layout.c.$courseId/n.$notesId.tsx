import { getAuthGetMeQueryOptions } from "@/api/auth/auth";
import { getNotesServiceGetNoteQueryOptions } from "@/api/notes/notes";
import { FullSetupEditor } from "@/components/editor/editor";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useRef } from "react";

export const Route = createFileRoute("/_layout/c/$courseId/n/$notesId")({
  component: RouteComponent,
  loader: async ({ params: { notesId, courseId }, context: { queryClient } }) => {
    const notes = await queryClient.ensureQueryData(getNotesServiceGetNoteQueryOptions(notesId));

    if (notes.status !== 200) {
      throw redirect({ to: "/c/$courseId", params: { courseId } });
    }

    const user = await queryClient.ensureQueryData(getAuthGetMeQueryOptions());

    if (user.status !== 200) {
      throw redirect({ to: "/login", params: { courseId } });
    }

    return { notes: notes.data, user: user.data };
  },
});

function RouteComponent() {
  const { notesId } = Route.useParams();
  const { user } = Route.useLoaderData();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="h-full w-full" ref={containerRef}>
      <FullSetupEditor
        key={notesId}
        user={user}
        roomId={notesId}
        type="notes"
        containerBoxRef={containerRef}
      />
    </div>
  );
}
