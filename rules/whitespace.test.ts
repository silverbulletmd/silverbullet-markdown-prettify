import { describe, expect, test } from "vitest";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { finalizeWhitespace, normalizeBlankLines, unwrapSoftWrappedParagraphs } from "./whitespace.ts";
import { DEFAULT_CONFIG } from "../pipeline.ts";

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
  test("trims trailing whitespace on each line", () => {
    expect(finalizeWhitespace("hello   \nworld\n", DEFAULT_CONFIG))
      .toBe("hello\nworld\n");
  });

  test("collapses 3+ blank lines to one", () => {
    expect(finalizeWhitespace("a\n\n\n\nb\n", DEFAULT_CONFIG))
      .toBe("a\n\nb\n");
  });

  test("ensures exactly one trailing newline", () => {
    expect(finalizeWhitespace("abc", DEFAULT_CONFIG)).toBe("abc\n");
    expect(finalizeWhitespace("abc\n\n\n", DEFAULT_CONFIG)).toBe("abc\n");
  });

  test("respects toggles", () => {
    const cfg = {
      ...DEFAULT_CONFIG,
      trimTrailingWhitespace: false,
      collapseBlankLines: false,
      ensureTrailingNewline: false,
    };
    expect(finalizeWhitespace("a   \n\n\n\nb", cfg)).toBe("a   \n\n\n\nb");
  });

  test("preserves trailing two-space hard breaks", () => {
    const src = "line one  \nline two\n";
    expect(finalizeWhitespace(src, DEFAULT_CONFIG)).toBe(src);
  });

  test("does not touch trailing whitespace inside fenced code blocks", () => {
    const src = "before   \n```\nkeep   me   \nintact   \n```\nafter   \n";
    const expected = "before\n```\nkeep   me   \nintact   \n```\nafter\n";
    expect(finalizeWhitespace(src, DEFAULT_CONFIG)).toBe(expected);
  });
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
