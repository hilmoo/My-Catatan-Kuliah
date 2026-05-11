import { createFileRoute } from "@tanstack/react-router";
import Tiptap from "@/Tiptap";

export const Route = createFileRoute("/tiptap")({
  component: TiptapRouteComponent,
});

function TiptapRouteComponent() {
  return <Tiptap />;
}
