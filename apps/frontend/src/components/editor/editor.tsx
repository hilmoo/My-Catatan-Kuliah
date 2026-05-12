import { useCallback, useEffect, useMemo, useRef } from "react";
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
  initialValue?: YooptaContentValue;
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
  const url = `ws://${window.location.host}${targetPath}`;

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
        url: url,
        roomId: roomId,
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar_url,
          color: stringToColor(user.id),
        },
      },
    );
  }, [user.avatar_url, user.id, user.name, url, roomId]);

  useEffect(() => {
    editor.collaboration.connect();

    return () => {
      editor.collaboration.disconnect();
    };
  }, [editor.collaboration]);

  useEffect(() => {
    const data = initial;

    if (data) {
      editor.withoutSavingHistory(() => {
        editor.setEditorValue(data);
        editor.focus();
      });
    }
  }, [editor]);

  const renderBlock = useCallback(({ children, blockId }: RenderBlockProps) => {
    return (
      <SortableBlock id={blockId} useDragHandle>
        {children}
      </SortableBlock>
    );
  }, []);

  return (
    <div ref={containerBoxRef} className="w-full h-full">
      <BlockDndContext editor={editor}>
        <YooptaEditor
          editor={editor}
          style={EDITOR_STYLES}
          renderBlock={renderBlock}
          placeholder="Type / to open menu, or start typing..."
          onChange={onChange}
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
