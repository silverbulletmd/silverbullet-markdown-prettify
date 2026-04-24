import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { skipOpaque } from "../pipeline.ts";
import type { PrettifyConfig } from "../pipeline.ts";

// `source` is the original text the tree was parsed from. Required for
// mid-word detection — offsets index into the original source.
export function normalizeEmphasis(
  tree: ParseTree,
  cfg: PrettifyConfig,
  source: string,
): void {
  skipOpaque(tree, (n) => {
    if (n.type !== "Emphasis" && n.type !== "StrongEmphasis") return;
    const isMidWord = nodeIsMidWord(n, source);
    const target = isMidWord
      ? "*"
      : n.type === "Emphasis"
      ? cfg.emphasisMarker
      : cfg.strongMarker;
    const repeat = n.type === "Emphasis" ? 1 : 2;
    for (const child of n.children ?? []) {
      if (child.type !== "EmphasisMark") continue;
      const textNode = child.children?.[0];
      if (textNode && textNode.text !== undefined) {
        textNode.text = target.repeat(repeat);
      }
    }
  });
}

function nodeIsMidWord(n: ParseTree, source: string): boolean {
  const from = n.from;
  const to = n.to;
  if (from === undefined || to === undefined) return false;
  const before = from > 0 ? source[from - 1] : "";
  const after = to < source.length ? source[to] : "";
  return /\w/.test(before) || /\w/.test(after);
}
