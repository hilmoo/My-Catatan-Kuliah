import { createFileRoute } from "@tanstack/react-router";
import { StudyHub } from "@/components/study-hub";

export const Route = createFileRoute("/study")({
  component: StudyRouteComponent,
});

function StudyRouteComponent() {
  return <StudyHub />;
}
