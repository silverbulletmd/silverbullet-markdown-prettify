import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { OPAQUE_TYPES } from "../pipeline.ts";

export function collapseSpaceRuns(tree: ParseTree): void {
  // Indentation can be split across gap nodes. Track the rendered line position
  // across all leaves, including opaque content, without modifying that content.
  let atLineStart = true;
  function walk(node: ParseTree, opaque = false): void {
    opaque = opaque || (node.type !== undefined && OPAQUE_TYPES.has(node.type));
    if (node.text !== undefined) {
      const text = node.text;
      let result = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === " ") {
          let end = i + 1;
          while (text[end] === " ") end++;
          const spaces = text.slice(i, end);
          const hardBreak = spaces.length >= 2 &&
            (text[end] === "\n" || text.slice(end, end + 2) === "\r\n");
          result += opaque || atLineStart || hardBreak ? spaces : " ";
          i = end - 1;
        } else {
          result += ch;
          if (ch === "\n") atLineStart = true;
          else if (ch !== "\t" && ch !== "\r") atLineStart = false;
        }
      }
      if (!opaque) node.text = result;
      return;
    }
    for (const child of node.children ?? []) walk(child, opaque);
  }

  walk(tree);
}
