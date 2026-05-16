import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import YooptaEditor, {
  createYooptaEditor,
  type RenderBlockProps,
  type SlateElement,
  type YooptaContentValue,
  type YooptaOnChangeOptions,
  YooptaPlugin,
} from "@yoopta/editor";

import { YOOPTA_PLUGINS } from "./plugins";
import { YOOPTA_MARKS } from "./marks";
import { SelectionBox } from "@yoopta/ui/selection-box";
import { YooptaToolbar } from "./components/toolbar";
import { YooptaSlashCommandMenu } from "./components/slash-command-menu";
import { YooptaFloatingBlockActions } from "./components/floating-block-actions";
import { BlockDndContext, SortableBlock } from "@yoopta/ui/block-dnd";
import { withMentions } from "@yoopta/mention";
// @ts-expect-error - MentionDropdown types not properly exported
import { MentionDropdown } from "@yoopta/themes-shadcn/mention";
// @ts-expect-error - EmojiDropdown types not properly exported
import { EmojiDropdown } from "@yoopta/themes-shadcn/emoji";
import { withEmoji } from "@yoopta/emoji";
import { withCollaboration, RemoteCursors } from "@yoopta/collaboration";
import type { AuthMeResponse } from "@/api/model";
import { initial } from "./initial";
import { applyTheme } from "./applyTheme";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, WifiOff } from "lucide-react";

const EDITOR_STYLES = {
  width: "100%",
  height: "100%",
  paddingBottom: 100,
  overflowY: "auto" as const,
};

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += value.toString(16).padStart(2, "0");
  }
  return color;
}

interface FullSetupEditorProps {
  containerBoxRef?: React.RefObject<HTMLDivElement | null>;
  onChange?: (value: YooptaContentValue, options: YooptaOnChangeOptions) => void;
  user: AuthMeResponse;
  roomId: string;
  type: "notes" | "assignments";
}

const FullSetupEditor = ({
  containerBoxRef: externalRef,
  onChange,
  user,
  roomId,
  type,
}: FullSetupEditorProps) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerBoxRef = externalRef ?? internalRef;
  const targetPath = type === "notes" ? "/api/notes/ws" : "/api/assignments/ws";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${protocol}//${window.location.host}${targetPath}`;

  const deviceId =
    typeof window !== "undefined"
      ? (() => {
          const key = "collab-device-id";

          let id = localStorage.getItem(key);

          if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(key, id);
          }

          return id;
        })()
      : "server";

  const editor = useMemo(() => {
    return withCollaboration(
      withEmoji(
        withMentions(
          createYooptaEditor({
            plugins: applyTheme(YOOPTA_PLUGINS) as unknown as YooptaPlugin<
              Record<string, SlateElement>,
              unknown
            >[],
            marks: YOOPTA_MARKS,
          }),
        ),
      ),
      {
        url,
        roomId,
        user: {
          id: `${user.id}-${deviceId}`,
          name: user.name,
          avatar: user.avatar_url,
          color: stringToColor(user.id),
        },
      },
    );
  }, [user.avatar_url, user.id, user.name, url, roomId, deviceId]);

  const [status, setStatus] = useState<"connected" | "connecting" | "disconnected" | "error">(
    editor.collaboration.state.status,
  );

  useEffect(() => {
    const handleStatusChange = (payload: { status: typeof status }) => setStatus(payload.status);
    (editor as any).on("collaboration:status-change", handleStatusChange);

    editor.collaboration.connect();

    return () => {
      (editor as any).off("collaboration:status-change", handleStatusChange);
      editor.collaboration.disconnect();
    };
  }, [editor]);

  useEffect(() => {
    const data = initial;

    if (data) {
      editor.withoutSavingHistory(() => {
        editor.setEditorValue(data);
      });
    }
  }, [editor]);

  useEffect(() => {
    if (status === "connected") {
      editor.focus();
    }
  }, [editor, status]);

  const handleChange = useCallback(
    (value: YooptaContentValue, options: YooptaOnChangeOptions) => {
      if (Object.keys(value).length === 0) {
        editor.withoutSavingHistory(() => {
          editor.setEditorValue(initial);
        });
      }
      onChange?.(value, options);
    },
    [editor, onChange],
  );

  const renderBlock = useCallback(({ children, blockId }: RenderBlockProps) => {
    return (
      <SortableBlock id={blockId} useDragHandle>
        {children}
      </SortableBlock>
    );
  }, []);

  if (status === "connecting") {
    return (
      <div className="flex flex-col gap-4 p-8 w-full h-full">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[80%]" />
        <Skeleton className="h-64 w-full mt-4" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            Failed to connect to the collaboration server. Please refresh the page or check your
            internet connection.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (status === "disconnected") {
    return (
      <div className="p-8">
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Disconnected</AlertTitle>
          <AlertDescription>
            You are currently offline. Changes will not be synced until connection is restored.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div ref={containerBoxRef} className="w-full h-full">
      <BlockDndContext editor={editor}>
        <YooptaEditor
          editor={editor}
          style={EDITOR_STYLES}
          renderBlock={renderBlock}
          placeholder="Type / to open menu, or start typing..."
          onChange={handleChange}
        >
          <RemoteCursors />
          <YooptaToolbar />
          <YooptaFloatingBlockActions />
          <YooptaSlashCommandMenu />
          <SelectionBox selectionBoxElement={containerBoxRef} />
          <MentionDropdown />
          <EmojiDropdown />
        </YooptaEditor>
      </BlockDndContext>
    </div>
  );
};

export { FullSetupEditor };
