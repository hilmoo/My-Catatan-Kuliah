import { createFileRoute } from "@tanstack/react-router";
import Tiptap from "../Tiptap";

export const Route = createFileRoute("/tiptap")({
  component: TipTapPage,
});

function TipTapPage() {
  return (
    <div className="p-4">
      <h2 className="mb-4">Tiptap Playground</h2>
      <Tiptap />
    </div>
  );
}
