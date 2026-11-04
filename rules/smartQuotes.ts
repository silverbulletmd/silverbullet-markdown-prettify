import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { OPAQUE_TYPES } from "../tree.ts";

const LITERAL_TYPES = new Set([
  ...OPAQUE_TYPES, "CommentMarkerBlock", "CodeText", "FrontMatterCode",
  "Attribute", "URL", "LinkTitle", "LinkReference", "LinkReferenceDefinition",
  "WikiLinkPage", "Escape", "Entity",
]);

export function smartQuotes(tree: ParseTree): void {
  let previous = "";
  function walk(node: ParseTree): void {
    if (node.type && LITERAL_TYPES.has(node.type)) {
      const text = renderToText(node);
      if (text) previous = text.slice(-1);
      return;
    }
    // Inline emphasis delimiters aren't part of the quoted prose.
    if (node.type === "EmphasisMark") return;
    if (node.text !== undefined) {
      let result = "";
      for (const ch of node.text) {
        let converted = ch;
        if (ch === '"' || ch === "'") {
          // Match SilverBullet's smart quote keybinding, with an opening quote
          // at the start of a page or selection.
          const opening = previous === "" ||
            (/\W/.test(previous) && !/[!?,.\-=“]/.test(previous));
          converted = ch === '"' ? (opening ? "“" : "”") : (opening ? "‘" : "’");
        }
        result += converted;
        previous = converted;
      }
      node.text = result;
    } else {
      for (const child of node.children ?? []) walk(child);
    }
  }
  walk(tree);
}
