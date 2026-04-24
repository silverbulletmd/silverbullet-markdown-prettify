import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { skipOpaque } from "../pipeline.ts";
import type { PrettifyConfig } from "../pipeline.ts";

export function normalizeBullets(tree: ParseTree, cfg: PrettifyConfig): void {
  skipOpaque(tree, (n) => {
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
