import { describe, expect, test } from "vitest";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { normalizeEmphasis } from "./emphasis.ts";
import { DEFAULT_CONFIG } from "../pipeline.ts";

function emphasisMark(text: string): ParseTree {
  return { type: "EmphasisMark", children: [{ text }] };
}

function emphasis(marker: string, content: string, from?: number, to?: number): ParseTree {
  const node: ParseTree = {
    type: "Emphasis",
    children: [
      emphasisMark(marker),
      { text: content },
      emphasisMark(marker),
    ],
  };
  if (from !== undefined) node.from = from;
  if (to !== undefined) node.to = to;
  return node;
}

function strong(marker: string, content: string, from?: number, to?: number): ParseTree {
  const doubleMarker = marker.repeat(2);
  const node: ParseTree = {
    type: "StrongEmphasis",
    children: [
      emphasisMark(doubleMarker),
      { text: content },
      emphasisMark(doubleMarker),
    ],
  };
  if (from !== undefined) node.from = from;
  if (to !== undefined) node.to = to;
  return node;
}

describe("normalizeEmphasis", () => {
  test("underscore italic is rewritten to asterisk with default config (emphasisMarker: '*')", () => {
    // source = "_em_", emphasis spans [0,4]
    const source = "_em_";
    const node = emphasis("_", "em", 0, 4);
    const root: ParseTree = { children: [node] };
    normalizeEmphasis(root, DEFAULT_CONFIG, source);
    const out = renderToText(root);
    expect(out).toBe("*em*");
  });

  test("asterisk italic is rewritten to underscore when emphasisMarker is '_'", () => {
    const cfg = { ...DEFAULT_CONFIG, emphasisMarker: "_" as const };
    // source = "*em*", emphasis spans [0,4]
    const source = "*em*";
    const node = emphasis("*", "em", 0, 4);
    const root: ParseTree = { children: [node] };
    normalizeEmphasis(root, cfg, source);
    const out = renderToText(root);
    expect(out).toBe("_em_");
  });

  test("strong: underscore (__) is rewritten to asterisk (**) with default config", () => {
    // source = "__bold__", StrongEmphasis spans [0,8]
    const source = "__bold__";
    const node = strong("_", "bold", 0, 8);
    const root: ParseTree = { children: [node] };
    normalizeEmphasis(root, DEFAULT_CONFIG, source);
    const out = renderToText(root);
    expect(out).toBe("**bold**");
  });

  test("strong: asterisk (**) is rewritten to underscore (__) when strongMarker is '_'", () => {
    const cfg = { ...DEFAULT_CONFIG, strongMarker: "_" as const };
    // source = "**bold**", StrongEmphasis spans [0,8]
    const source = "**bold**";
    const node = strong("*", "bold", 0, 8);
    const root: ParseTree = { children: [node] };
    normalizeEmphasis(root, cfg, source);
    const out = renderToText(root);
    expect(out).toBe("__bold__");
  });

  test("mid-word emphasis always uses '*' even when emphasisMarker is '_'", () => {
    const cfg = { ...DEFAULT_CONFIG, emphasisMarker: "_" as const };
    // source = "foo_bar_baz" — the emphasis "_bar_" is at positions [3,8]
    // source[2] = 'o' which is a word char, so mid-word detection fires
    const source = "foo_bar_baz";
    const node = emphasis("_", "bar", 3, 8);
    const root: ParseTree = { children: [{ text: "foo" }, node, { text: "baz" }] };
    normalizeEmphasis(root, cfg, source);
    const out = renderToText(root);
    // Mid-word: must stay as '*'
    expect(out).toBe("foo*bar*baz");
  });

  test("emphasis without from/to offsets is not treated as mid-word", () => {
    const cfg = { ...DEFAULT_CONFIG, emphasisMarker: "_" as const };
    // No from/to set, so mid-word check returns false → use config marker
    const node = emphasis("*", "em");
    const root: ParseTree = { children: [node] };
    normalizeEmphasis(root, cfg, "*em*");
    const out = renderToText(root);
    expect(out).toBe("_em_");
  });
});
