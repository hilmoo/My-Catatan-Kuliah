import { useGetPage } from "~/api/pages/pages";
import { API_FETCH_OPTIONS } from "~/lib/api-client";
import Tiptap from "~/Tiptap";
import { defaultIconForType, PAGE_TYPE_LABEL, type PageType } from "~/lib/page-hierarchy";
import type { PageDetail } from "~/api/model/pageDetail";

interface Props {
  pageId: string;
}

function detectType(page: PageDetail): PageType | null {
  const props = page.properties as Record<string, unknown> | undefined;
  if (!props) return null;
  if ("status" in props) return "assignment";
  if ("semester" in props) return "course";
  if ("color" in props) return "folder";
  if ("tags" in props) return "note";
  return null;
}

export function PageView({ pageId }: Props) {
  const query = useGetPage(pageId, {
    fetch: API_FETCH_OPTIONS,
    query: { enabled: !!pageId },
  });

  if (query.isLoading) return <p className="helper-text">Loading page…</p>;

  if (query.data?.status !== 200) {
    return <p className="helper-text">Page not found or unavailable.</p>;
  }

  const page = query.data.data;
  const type = detectType(page);

  return (
    <article className="page-view">
      <header className="page-view-header">
        <div className="page-view-icon">
          {page.icon || (type ? defaultIconForType(type) : "📄")}
        </div>
        <div>
          {type && <p className="study-kicker">{PAGE_TYPE_LABEL[type]}</p>}
          <h1>{page.title || "Untitled"}</h1>
        </div>
      </header>

      <div className="page-view-body">
        {type === "note" || type === null ? (
          <Tiptap collaborative pageId={pageId} />
        ) : (
          <PagePropertiesView page={page} type={type} />
        )}
      </div>
    </article>
  );
}

function PagePropertiesView({ page, type }: { page: PageDetail; type: PageType }) {
  const props = (page.properties ?? {}) as Record<string, unknown>;
  return (
    <div className="page-properties">
      <h3>Properties</h3>
      <dl>
        {Object.entries(props).map(([k, v]) => (
          <div key={k} className="page-property-row">
            <dt>{k}</dt>
            <dd>{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
          </div>
        ))}
        {Object.keys(props).length === 0 && (
          <p className="helper-text">No properties for this {type}.</p>
        )}
      </dl>
    </div>
  );
}
