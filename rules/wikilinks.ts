import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { skipOpaque } from "../pipeline.ts";

export function normalizeWikilinks(tree: ParseTree): void {
  skipOpaque(tree, (n) => {
    if (n.type !== "WikiLink") return;
    for (const child of n.children ?? []) {
      if (child.type !== "WikiLinkPage" && child.type !== "WikiLinkAlias") {
        continue;
      }
      const t = child.children?.[0];
      if (t && t.text !== undefined) {
        t.text = t.text.trim();
      }
    }
  });
}
