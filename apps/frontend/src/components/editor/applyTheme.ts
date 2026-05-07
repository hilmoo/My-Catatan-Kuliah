import type { YooptaPlugin } from "@yoopta/editor";

import { AccordionUI } from "./theme/accordion";
import { BlockquoteUI } from "./theme/blockquote";
import { CalloutUI } from "./theme/callout";
import { CarouselUI } from "./theme/carousel";
import { CodeUI } from "./theme/code";
import { CodeGroupUI } from "./theme/code-group";
import { DividerUI } from "./theme/divider";
import { EmbedUI } from "./theme/embed";
import { FileUI } from "./theme/file";
import { HeadingsUI } from "./theme/headings";
import { ImageUI } from "./theme/image";
import { LinkUI } from "./theme/link";
import { ListsUI } from "./theme/lists";
import { MathInlineUI, MathBlockUI } from "./theme/math";
import { MentionUI } from "./theme/mention";
import { ParagraphUI } from "./theme/paragraph";
import { StepsUI } from "./theme/steps";
import { TableUI } from "./theme/table";
import { TableOfContentsUI } from "./theme/table-of-contents";
import { TabsUI } from "./theme/tabs";
import { VideoUI } from "./theme/video";

type PluginWithUI = YooptaPlugin<any, any>;
type PluginExtensions = Record<
  string,
  {
    injectElementsFromPlugins?: PluginWithUI[];

    events?: any;

    options?: any;

    elements?: any;
  }
>;

/**
 * Applies Shadcn UI components to plugins automatically
 *
 * @param plugins - Array of plugins to apply UI to
 * @param extensions - Optional object with additional extensions per plugin type
 * @returns Array of plugins with Shadcn UI applied
 *
 * @example
 * ```typescript
 * const plugins = applyTheme([
 *   Accordion,
 *   Paragraph,
 *   Headings.HeadingOne,
 * ], {
 *   Accordion: {
 *     injectElementsFromPlugins: [Paragraph, Headings.HeadingOne]
 *   }
 * });
 * ```
 */
export function applyTheme(plugins: PluginWithUI[], extensions?: PluginExtensions): PluginWithUI[] {
  // Mapping of plugin types to their UI components
  const uiMap: Record<string, any> = {
    Accordion: AccordionUI,
    Paragraph: ParagraphUI,
    Blockquote: BlockquoteUI,
    Callout: CalloutUI,
    Table: TableUI,
    TableOfContents: TableOfContentsUI,
    Link: LinkUI,
    HeadingOne: HeadingsUI.HeadingOne,
    HeadingTwo: HeadingsUI.HeadingTwo,
    HeadingThree: HeadingsUI.HeadingThree,
    BulletedList: ListsUI.BulletedList,
    NumberedList: ListsUI.NumberedList,
    TodoList: ListsUI.TodoList,
    Image: ImageUI,
    Video: VideoUI,
    Code: CodeUI,
    Tabs: TabsUI,
    CodeGroup: CodeGroupUI,
    Steps: StepsUI,
    Carousel: CarouselUI,
    Divider: DividerUI,
    Embed: EmbedUI,
    File: FileUI,
    Mention: MentionUI,
    MathInline: MathInlineUI,
    MathBlock: MathBlockUI,
  };

  return plugins.map((plugin) => {
    const pluginType = plugin.getPlugin.type;
    const ui = uiMap[pluginType];

    // If no UI found for this plugin type, return as is
    if (!ui) {
      return plugin;
    }

    // Get extension config for this plugin type
    const extension = extensions?.[pluginType];

    // Apply UI and any additional extensions
    // If extension provides custom elements, use them; otherwise use default UI
    const elementsToApply = extension?.elements ?? ui;

    return plugin.extend({
      elements: elementsToApply,
      ...(extension && {
        injectElementsFromPlugins: extension.injectElementsFromPlugins,
        events: extension.events,
        options: extension.options,
      }),
    });
  });
}
