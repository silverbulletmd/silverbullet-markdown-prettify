import { describe, expect, test } from "vitest";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { finalizeWhitespace, unwrapSoftWrappedParagraphs } from "./whitespace.ts";
import { DEFAULT_CONFIG } from "../pipeline.ts";

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
