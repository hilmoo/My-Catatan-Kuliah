import { SlateElement, YooptaContentValue } from "@yoopta/editor";
import * as Y from "yjs";

/**
 * Rebuilds a YooptaContentValue from a Y.Doc and logs it to the console.
 */
export function YDocAsYooptaValue(doc: Y.Doc): YooptaContentValue {
  return rebuildYooptaValueFromYDoc(doc);
}

/**
 * Reconstructs YooptaContentValue from the Y.Doc shared types.
 */
export function rebuildYooptaValueFromYDoc(doc: Y.Doc): YooptaContentValue {
  const blockOrder = doc.getArray<string>("blockOrder");
  const blockMeta = doc.getMap<Y.Map<string | number | undefined>>("blockMeta");
  const blockContents = doc.getMap<Y.XmlFragment>("blockContents");

  const blockIds = blockOrder.toArray();
  const value: YooptaContentValue = {};

  for (let i = 0; i < blockIds.length; i += 1) {
    const blockId = blockIds[i];
    const metaMap = blockMeta.get(blockId);
    const fragment = blockContents.get(blockId);

    if (metaMap && fragment) {
      const type = metaMap.get("type") as string;
      const depth = (metaMap.get("depth") as number) ?? 0;
      const align = (metaMap.get("align") as string) || "left";

      // Convert Y.XmlFragment back to Slate Element[]
      const slateValue = convertXmlFragmentToSlate(fragment);

      value[blockId] = {
        id: blockId,
        type: type,
        value: slateValue,
        meta: {
          order: i,
          depth: depth,
          align: align as "left" | "center" | "right" | undefined,
        },
      };
    }
  }

  return value;
}

/**
 * Traverses a Y.XmlFragment and converts it back into a Slate-compatible JSON structure.
 * Y.XmlElement (nodeName = slate type) -> attrs: { id, props? } -> Y.XmlText (marks as attributes)
 */
function convertXmlFragmentToSlate(fragment: Y.XmlFragment): SlateElement[] {
  const slateElements: SlateElement[] = [];

  // Use .toArray() to avoid the Symbol.iterator type error
  for (const child of fragment.toArray()) {
    if (child instanceof Y.XmlElement) {
      slateElements.push(convertXmlElementToSlate(child));
    }
  }

  return slateElements;
}

function convertXmlElementToSlate(element: Y.XmlElement): SlateElement {
  const attributes = element.getAttributes();
  const slateNode: SlateElement = {
    id: (attributes.id as string) || Math.random().toString(36).substr(2, 9),
    type: element.nodeName,
    ...attributes,
    children: [],
  };

  // Use .toArray() to avoid the Symbol.iterator type error
  for (const child of element.toArray()) {
    if (child instanceof Y.XmlText) {
      // Y.XmlText can contain formatting (marks) stored as attributes on the delta
      const deltas = child.toDelta();

      for (const op of deltas) {
        if (typeof op.insert === "string") {
          const textNode: any = {
            text: op.insert,
          };

          // Marks (bold, italic, etc.) are stored in the attributes of the delta operation
          if (op.attributes) {
            Object.assign(textNode, op.attributes);
          }

          slateNode.children.push(textNode);
        }
      }
    } else if (child instanceof Y.XmlElement) {
      // Recursively handle nested elements (e.g., lists containing list items)
      slateNode.children.push(convertXmlElementToSlate(child));
    }
  }

  return slateNode;
}
