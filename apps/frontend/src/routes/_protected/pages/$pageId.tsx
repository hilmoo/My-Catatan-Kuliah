import { createFileRoute } from "@tanstack/react-router";
import { PageView } from "~/components/page/page-view";

export const Route = createFileRoute("/_protected/pages/$pageId")({
  component: PageRoute,
});

function PageRoute() {
  const { pageId } = Route.useParams();
  return <PageView pageId={pageId} />;
}
