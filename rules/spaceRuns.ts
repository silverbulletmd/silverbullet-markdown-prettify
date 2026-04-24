import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { skipOpaque } from "../pipeline.ts";

export function collapseSpaceRuns(tree: ParseTree): void {
  skipOpaque(tree, (n) => {
    if (n.text === undefined) return;
    n.text = collapse(n.text);
  });
}

function collapse(s: string): string {
  // Collapse runs of 2+ spaces to 1 space, EXCEPT preserve the exact sequence
  // "  \n" (two trailing spaces followed by newline — a Markdown hard break).
  return s.replace(/ {2,}(?!\n)/g, " ");
}
