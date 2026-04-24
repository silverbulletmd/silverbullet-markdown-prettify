import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { skipOpaque } from "../pipeline.ts";
import type { PrettifyConfig } from "../pipeline.ts";

// Unwrap soft-wrapped paragraph text. Called on the full tree; walks into
// non-opaque subtrees only. Preserves trailing two-space hard breaks and
// trailing-backslash hard breaks.
export function unwrapSoftWrappedParagraphs(tree: ParseTree): void {
  skipOpaque(tree, (n) => {
    if (n.type !== "Paragraph" || !n.children) return;
    for (const child of n.children) {
      if (child.text === undefined) continue;
      child.text = rewriteSoftWraps(child.text);
    }
  });
}

function rewriteSoftWraps(s: string): string {
  const endsWithNewline = s.endsWith("\n");
  const body = endsWithNewline ? s.slice(0, -1) : s;
  let out = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch !== "\n") {
      out += ch;
      continue;
    }
    const prev2 = body.slice(Math.max(0, i - 2), i);
    const prev1 = body[i - 1];
    const isHardBreak = prev2 === "  " || prev1 === "\\";
    out += isHardBreak ? "\n" : " ";
  }
  return out + (endsWithNewline ? "\n" : "");
}

export function finalizeWhitespace(text: string, cfg: PrettifyConfig): string {
  const lines = text.split("\n");
  let inFence = false;
  const out: string[] = [];
  for (const line of lines) {
    const isFenceLine = /^`{3,}[^`]*$/.test(line.trim());
    if (isFenceLine) {
      // Fence lines themselves are passed through unchanged.
      out.push(line);
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      // Inside fence — don't trim.
      out.push(line);
      continue;
    }
    if (cfg.trimTrailingWhitespace) {
      out.push(line.endsWith("  ") && /[^ \t]  $/.test(line)
        ? line
        : line.replace(/[ \t]+$/, ""));
    } else {
      out.push(line);
    }
  }
  let result = out.join("\n");
  if (cfg.collapseBlankLines) {
    // Collapse runs of 3+ blank lines, but only OUTSIDE fences.
    result = collapseOutsideFences(result);
  }
  if (cfg.ensureTrailingNewline) {
    result = result.replace(/\n+$/, "") + "\n";
  }
  return result;
}

function collapseOutsideFences(s: string): string {
  const lines = s.split("\n");
  let inFence = false;
  const segments: { fence: boolean; content: string[] }[] = [
    { fence: false, content: [] },
  ];
  for (const line of lines) {
    const isFenceLine = /^`{3,}[^`]*$/.test(line.trim());
    if (isFenceLine) {
      // Push fence line onto its own segment (as-is, don't collapse).
      segments.push({ fence: true, content: [line] });
      inFence = !inFence;
      segments.push({ fence: inFence, content: [] });
      continue;
    }
    segments[segments.length - 1].content.push(line);
  }
  return segments
    .map((seg) => {
      if (seg.fence) return seg.content.join("\n");
      const joined = seg.content.join("\n");
      return joined.replace(/\n{3,}/g, "\n\n");
    })
    .join("\n");
}
