import { createFileRoute } from "@tanstack/react-router";
import { StudyHub } from "~/components/study-hub";

export const Route = createFileRoute("/")({
  component: Home,
});
function Home() {
  return <StudyHub />;
}

