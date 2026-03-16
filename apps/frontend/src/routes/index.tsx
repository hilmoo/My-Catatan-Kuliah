import { createFileRoute } from "@tanstack/react-router";
import Tiptap from "../Tiptap";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="p-2">
      <h3 className="mb-2">Welcome Home!</h3>
      <Tiptap />
    </div>
  );
}

