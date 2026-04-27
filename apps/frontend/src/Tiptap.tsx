import { useEffect, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Collaboration } from "@tiptap/extension-collaboration";
import type { AnyExtension } from "@tiptap/core";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { SimpleEditor } from "~/components/tiptap-templates/simple/simple-editor";

interface TiptapProps {
  collaborative?: boolean;
  pageId?: string | null;
}
function CollaborativeEditor({ pageId }: { pageId: string }) {
  const ydoc = useMemo(() => new Y.Doc(), [pageId]);

  const wsUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "ws://localhost:3000/pages/ws";
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/pages/ws/${pageId}`;
  }, [pageId]);

  const provider = useMemo(() => {
    return new HocuspocusProvider({
      url: wsUrl,
      name: pageId,
      document: ydoc,
    });
  }, [pageId, wsUrl, ydoc]);

  useEffect(() => {
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc }) as unknown as AnyExtension,
    ],
  });

  if (!editor) {
    return <div className="helper-text">Connecting editor...</div>;
  }

  return <EditorContent editor={editor} className="simple-editor-content" />;
}

export default function Tiptap({ collaborative = false, pageId }: TiptapProps) {
  if (!collaborative) {
    return <SimpleEditor />;
  }

  if (!pageId) {
    return <p className="helper-text">Pick a note page first to start collaborative editing.</p>;
  }

  return <CollaborativeEditor pageId={pageId} />;
}
