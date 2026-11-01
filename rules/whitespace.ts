import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { endsInOpaqueBlock, replaceEditableText, skipOpaque } from "../tree.ts";
import type { PrettifyConfig, Scope } from "../config.ts";

// Work on parser gaps so heading-like text and blank lines in opaque blocks
// are not mistaken for document structure.
export function normalizeBlankLines(tree: ParseTree, scope: Scope): void {
  skipOpaque(tree, (node) => {
    const children = node.children ?? [];
    for (let i = 1; i < children.length; i++) {
      if (!/^(?:ATXHeading[1-6]|SetextHeading[12])$/.test(children[i - 1].type ?? "")) continue;
      const gap = children[i];
      if (gap.text !== undefined && !gap.type && /^[ \t\r\n]*$/.test(gap.text)) {
        gap.text = gap.text.replace(/(\r?\n)(?:[ \t]*\r?\n)+/g, "$1");
      }
    }
  });
  if (scope !== "page") return;
  const children = tree.children ?? [];
  if (children.every((node) => !node.type && /^[ \t\r\n]*$/.test(node.text ?? ""))) {
    for (const node of children) node.text = "";
    return;
  }
  const first = children[0];
  if (first?.text !== undefined && !first.type) {
    first.text = first.text.replace(/^(?:[ \t]*\r?\n)+/, "");
  }
  const last = children[children.length - 1];
  if (last?.text !== undefined && !last.type) {
    last.text = last.text.replace(/(\r?\n)[ \t\r\n]*$/, "$1");
  }
}

// Unwrap soft-wrapped paragraph text. Called on the full tree; walks into
// non-opaque subtrees only. Preserves trailing two-space hard breaks and
// trailing-backslash hard breaks.
export function unwrapSoftWrappedParagraphs(tree: ParseTree): void {
  skipOpaque(tree, (n) => {
    if (n.type !== "Paragraph" || !n.children) return;
    const children = n.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.text === undefined) continue;
      // Only the paragraph's final text node ends with the terminating
      // newline. A trailing newline on any earlier text node (e.g. a node
      // that precedes inline markup like **bold**) is a soft wrap and must
      // be reflowed too.
      const isLast = i === children.length - 1;
      child.text = rewriteSoftWraps(child.text, isLast);
    }
  });
}

function rewriteSoftWraps(s: string, preserveTrailingNewline: boolean): string {
  const endsWithNewline = preserveTrailingNewline && s.endsWith("\n");
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

// Whitespace policy uses the parser's protection boundaries, including hard
// breaks. No second Markdown/fence parser runs after rendering.
export function finalizeWhitespace(tree: ParseTree, cfg: PrettifyConfig, scope: Scope): void {
  if (cfg.trimTrailingWhitespace) {
    replaceEditableText(tree, /[ \t]+(?=\r?$)/gm, (match, text) => {
      const before = text[match.index! - 1];
      const after = text.slice(match.index! + match[0].length);
      const hardBreak = /^ {2,}$/.test(match[0]) && before !== undefined &&
        before !== "\n" && before !== "\r" && /^\r?\n/.test(after);
      return hardBreak ? match[0] : "";
    });
  }
  if (cfg.collapseBlankLines) {
    replaceEditableText(tree, /(?:\r?\n){3,}/g, () => "\n\n");
  }
  if (scope === "page" && cfg.ensureTrailingNewline) {
    replaceEditableText(tree, /\n+$/g, () => "\n");
    if (!renderToText(tree).endsWith("\n") && !endsInOpaqueBlock(tree)) {
      tree.children ??= [];
      tree.children.push({ text: "\n" });
    }
  }
}
