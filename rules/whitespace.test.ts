import { describe, expect, test } from "vitest";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { finalizeWhitespace, normalizeBlankLines, unwrapSoftWrappedParagraphs } from "./whitespace.ts";
import { DEFAULT_CONFIG } from "../config.ts";

describe("normalizeBlankLines", () => {
  test.each([
    "ATXHeading1", "ATXHeading2", "ATXHeading3", "ATXHeading4",
    "ATXHeading5", "ATXHeading6", "SetextHeading1", "SetextHeading2",
  ])("removes blank lines after %s without removing following indentation", (type) => {
    const root: ParseTree = { children: [
      { text: "before\n\n" },
      { type, children: [{ text: "heading" }] },
      { text: "\n \t\n\n  " },
      { type: "Paragraph", children: [{ text: "content" }] },
    ] };
    normalizeBlankLines(root, "page");
    expect(renderToText(root)).toBe("before\n\nheading\n  content");
  });

  test("removes whitespace-only lines at page boundaries", () => {
    const root: ParseTree = { children: [
      { text: " \t\n\n  " },
      { type: "Paragraph", children: [{ text: "content" }] },
      { text: "\n  \n\t\n  " },
    ] };
    normalizeBlankLines(root, "page");
    expect(renderToText(root)).toBe("  content\n");
  });

  test("preserves selection boundary spacing", () => {
    const root: ParseTree = { children: [
      { text: "\n\n" },
      { type: "Paragraph", children: [{ text: "content" }] },
      { text: "\n\n" },
    ] };
    normalizeBlankLines(root, "selection");
    expect(renderToText(root)).toBe("\n\ncontent\n\n");
  });

  test.each(["FencedCode", "Blockquote", "FrontMatter"])("preserves blank lines inside %s", (type) => {
    const root: ParseTree = { children: [{ type, children: [
      { type: "ATXHeading1", children: [{ text: "# example" }] },
      { text: "\n\ncontent\n\n" },
    ] }] };
    normalizeBlankLines(root, "page");
    expect(renderToText(root)).toBe("# example\n\ncontent\n\n");
  });

  test("clears an entirely blank page", () => {
    const root: ParseTree = { children: [{ text: " \n\t\n " }] };
    normalizeBlankLines(root, "page");
    expect(renderToText(root)).toBe("");
  });
});

describe("finalizeWhitespace", () => {
  function finalizeText(text: string, cfg = DEFAULT_CONFIG): string {
    const tree: ParseTree = { children: [{ text }] };
    finalizeWhitespace(tree, cfg, "page");
    return renderToText(tree);
  }

  test("trims trailing tabs while preserving hard breaks of two or more spaces", () => {
    expect(finalizeText("hello\t\nworld   \nnext  \nend\t"))
      .toBe("hello\nworld   \nnext  \nend\n");
  });

  test("collapses interior blank lines and ensures one page newline", () => {
    expect(finalizeText("a\n\n\n\nb\n\n\n")).toBe("a\n\nb\n");
    expect(finalizeText("abc")).toBe("abc\n");
  });

  test("respects toggles", () => {
    const cfg = { ...DEFAULT_CONFIG, trimTrailingWhitespace: false,
      collapseBlankLines: false, ensureTrailingNewline: false };
    expect(finalizeText("a\t\n\n\n\nb", cfg)).toBe("a\t\n\n\n\nb");
  });

  test("handles whitespace split between leaves using rendered line context", () => {
    const tree: ParseTree = { children: [
      { text: "a " }, { text: "  " }, { text: "\nb\t" }, { text: "\n\n" }, { text: "\n\nc" },
    ] };
    finalizeWhitespace(tree, DEFAULT_CONFIG, "page");
    expect(renderToText(tree)).toBe("a   \nb\n\nc\n");
  });

  test.each(["FencedCode", "CodeBlock", "InlineCode", "FrontMatter", "HTMLBlock", "Blockquote", "MathBlock"])(
    "never edits whitespace in %s", type => {
      const tree: ParseTree = { children: [
        { text: "before\t\n" },
        { type, children: [{ text: "keep\t\n\n\n\nintact\t" }] },
        { text: "\nafter\t\n" },
      ] };
      finalizeWhitespace(tree, DEFAULT_CONFIG, "page");
      expect(renderToText(tree)).toBe("before\nkeep\t\n\n\n\nintact\t\nafter\n");
    },
  );
});

describe("unwrapSoftWrappedParagraphs", () => {
  test("joins internal newlines with a space", () => {
    const para: ParseTree = {
      type: "Paragraph",
      children: [{ text: "line one\nline two\n" }],
    };
    const root: ParseTree = { children: [para] };
    unwrapSoftWrappedParagraphs(root);
    expect(renderToText(root)).toBe("line one line two\n");
  });

  test("reflows a soft wrap at a text-node boundary before inline markup", () => {
    // Mirrors the real parse tree: inline markup (**bold**) splits a
    // paragraph into multiple children, so the soft-wrap newline lands at
    // the end of an earlier text node rather than the final one.
    const para: ParseTree = {
      type: "Paragraph",
      children: [
        { text: "the canonical implementation living in\n" },
        { type: "StrongEmphasis", children: [{ text: "**Core**" }] },
        { text: " and the rest\n" },
      ],
    };
    const root: ParseTree = { children: [para] };
    unwrapSoftWrappedParagraphs(root);
    expect(renderToText(root)).toBe(
      "the canonical implementation living in **Core** and the rest\n",
    );
  });

  test("preserves a hard break before inline markup", () => {
    const para: ParseTree = {
      type: "Paragraph",
      children: [
        { text: "keep this break  \n" },
        { type: "StrongEmphasis", children: [{ text: "**Core**" }] },
        { text: " done\n" },
      ],
    };
    const root: ParseTree = { children: [para] };
    unwrapSoftWrappedParagraphs(root);
    expect(renderToText(root)).toBe("keep this break  \n**Core** done\n");
  });

  test("preserves two-space hard break (  \\n)", () => {
    const para: ParseTree = {
      type: "Paragraph",
      children: [{ text: "line one  \nline two\n" }],
    };
    const root: ParseTree = { children: [para] };
    unwrapSoftWrappedParagraphs(root);
    expect(renderToText(root)).toBe("line one  \nline two\n");
  });

  test("preserves backslash hard break (\\\\\\n)", () => {
    const para: ParseTree = {
      type: "Paragraph",
      children: [{ text: "line one\\\nline two\n" }],
    };
    const root: ParseTree = { children: [para] };
    unwrapSoftWrappedParagraphs(root);
    expect(renderToText(root)).toBe("line one\\\nline two\n");
  });

  test("does not modify text inside Blockquote", () => {
    const para: ParseTree = {
      type: "Paragraph",
      children: [{ text: "line one\nline two\n" }],
    };
    const root: ParseTree = {
      children: [
        { type: "Blockquote", children: [para] },
      ],
    };
    unwrapSoftWrappedParagraphs(root);
    // Text inside the Blockquote (an opaque type) should be unchanged
    expect(para.children![0].text).toBe("line one\nline two\n");
  });

  test("does not modify text inside FencedCode", () => {
    const para: ParseTree = {
      type: "Paragraph",
      children: [{ text: "line one\nline two\n" }],
    };
    const root: ParseTree = {
      children: [
        { type: "FencedCode", children: [para] },
      ],
    };
    unwrapSoftWrappedParagraphs(root);
    // Text inside FencedCode (an opaque type) should be unchanged
    expect(para.children![0].text).toBe("line one\nline two\n");
  });
});
