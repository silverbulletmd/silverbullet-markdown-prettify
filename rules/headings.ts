import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { replaceNodesMatching } from "@silverbulletmd/silverbullet/lib/tree";
import { OPAQUE_TYPES } from "../pipeline.ts";

export function normalizeHeadings(tree: ParseTree): void {
  replaceNodesMatching(tree, (n) => {
    if (n.type && OPAQUE_TYPES.has(n.type)) {
      // Don't descend
      return n;
    }
    if (n.type !== "SetextHeading1" && n.type !== "SetextHeading2") return;
    const level = n.type === "SetextHeading1" ? 1 : 2;
    const inlineParts: string[] = [];
    for (const child of n.children ?? []) {
      if (child.type === "HeaderMark") continue;
      if (child.text !== undefined) {
        const cleaned = child.text.replace(/\n+/g, " ").trim();
        if (cleaned) inlineParts.push(cleaned);
      } else {
        const rendered = renderInline(child);
        if (rendered) inlineParts.push(rendered);
      }
    }
    const content = inlineParts.join(" ").replace(/\s+/g, " ").trim();
    const prefix = "#".repeat(level);
    return {
      type: `ATXHeading${level}`,
      children: [
        { type: "HeaderMark", children: [{ text: prefix }] },
        { text: ` ${content}` },
      ],
    };
  });
}

// Render inline children of a heading back to text, preserving their markup.
function renderInline(n: ParseTree): string {
  if (n.text !== undefined) return n.text;
  if (!n.children) return "";
  let out = "";
  for (const child of n.children) out += renderInline(child);
  return out;
}
