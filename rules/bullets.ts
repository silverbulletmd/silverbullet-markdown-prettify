import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { skipOpaque } from "../tree.ts";
import type { PrettifyConfig } from "../config.ts";

export function normalizeBullets(tree: ParseTree, cfg: PrettifyConfig): void {
  skipOpaque(tree, (n) => {
    if (n.type === "BulletList" || n.type === "OrderedList" || n.type === "ListItem") {
      removeListBlankLines(n);
    }
    if (n.type === "BulletList") {
      for (const item of n.children ?? []) {
        if (item.type !== "ListItem") continue;
        for (const c of item.children ?? []) {
          if (c.type !== "ListMark") continue;
          rewriteBulletMark(c, cfg.bulletMarker);
        }
      }
    } else if (n.type === "OrderedList") {
      renumberOrderedList(n);
    }
  });
}

// Parser gap nodes contain the newlines and indentation between list items.
// Only tighten gaps before items or nested lists: paragraph and code-block
// separators inside an item carry meaning and must remain intact.
function removeListBlankLines(node: ParseTree): void {
  const children = node.children ?? [];
  for (let i = 1; i < children.length - 1; i++) {
    const gap = children[i];
    const next = children[i + 1];
    if (gap.type || gap.text === undefined || !/^[ \t\r\n]+$/.test(gap.text)) continue;
    const beforeItem = next.type === "ListItem" && children[i - 1].type === "ListItem";
    const beforeNestedList = node.type === "ListItem" &&
      (next.type === "BulletList" || next.type === "OrderedList");
    if (beforeItem || beforeNestedList) {
      gap.text = gap.text.replace(/(\r?\n)(?:[ \t]*\r?\n)+/g, "$1");
    }
  }
}

function rewriteBulletMark(mark: ParseTree, target: string) {
  const textNode = mark.children?.[0];
  if (!textNode || textNode.text === undefined) return;
  if (/^[-*+]$/.test(textNode.text)) {
    textNode.text = target;
  }
}

// Renumber an OrderedList sequentially, normalize markers to "N." form.
// The starting number is taken from the first item's existing marker so that
// lists intentionally starting at 5 are preserved.
function renumberOrderedList(list: ParseTree) {
  let counter: number | null = null;
  for (const item of list.children ?? []) {
    if (item.type !== "ListItem") continue;
    for (const c of item.children ?? []) {
      if (c.type !== "ListMark") continue;
      const textNode = c.children?.[0];
      if (!textNode || textNode.text === undefined) continue;
      if (counter === null) {
        const m = textNode.text.match(/^(\d+)/);
        if (!m) return; // Unrecognized marker — leave the list alone.
        counter = parseInt(m[1], 10);
      }
      textNode.text = `${counter}.`;
      counter += 1;
    }
  }
}
