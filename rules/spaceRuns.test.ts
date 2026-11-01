import { describe, expect, test } from "vitest";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { collapseSpaceRuns } from "./spaceRuns.ts";
import { normalizeBullets } from "./bullets.ts";
import { DEFAULT_CONFIG } from "../pipeline.ts";

describe("collapseSpaceRuns", () => {
  test("preserves indentation while collapsing spaces in line content", () => {
    const root: ParseTree = { children: [{ text: "  * nested   item\n    1. deeper   item\n" }] };
    collapseSpaceRuns(root);
    expect(renderToText(root)).toBe("  * nested item\n    1. deeper item\n");
  });

  test("tracks line starts across nodes and opaque code", () => {
    const root: ParseTree = { children: [
      { text: "  " }, { text: "  indented" },
      { type: "InlineCode", children: [{ text: "`code`" }] },
      { text: "   words\n" }, { text: "    next\n" },
    ] };
    collapseSpaceRuns(root);
    expect(renderToText(root)).toBe("    indented`code` words\n    next\n");
  });

  test("keeps nested list indentation after removing blank lines", () => {
    const root: ParseTree = { type: "BulletList", children: [
      { type: "ListItem", children: [
        { type: "ListMark", children: [{ text: "*" }] }, { text: " parent" },
        { text: "\n\n    " },
        { type: "OrderedList", children: [
          { type: "ListItem", children: [
            { type: "ListMark", children: [{ text: "1." }] }, { text: " child   text" },
          ] },
        ] },
      ] },
    ] };
    normalizeBullets(root, DEFAULT_CONFIG);
    collapseSpaceRuns(root);
    expect(renderToText(root)).toBe("* parent\n    1. child text");
  });

  test("collapses runs of 3+ spaces to a single space", () => {
    const root: ParseTree = { children: [{ text: "hello   world\n" }] };
    collapseSpaceRuns(root);
    expect(renderToText(root)).toBe("hello world\n");
  });

  test("collapses runs of 2 spaces to a single space (non-hard-break)", () => {
    // Two spaces not followed by newline should also collapse
    const root: ParseTree = { children: [{ text: "foo  bar\n" }] };
    collapseSpaceRuns(root);
    expect(renderToText(root)).toBe("foo bar\n");
  });

  test("preserves hard break: two spaces immediately before newline", () => {
    const root: ParseTree = { children: [{ text: "line  \nmore\n" }] };
    collapseSpaceRuns(root);
    expect(renderToText(root)).toBe("line  \nmore\n");
  });

  test("preserves longer hard-break space runs", () => {
    const root: ParseTree = { children: [{ text: "line   \nmore\n" }] };
    collapseSpaceRuns(root);
    expect(renderToText(root)).toBe("line   \nmore\n");
  });

  test("text inside InlineCode is not touched (opaque)", () => {
    const code: ParseTree = {
      type: "InlineCode",
      children: [{ text: "x   y" }],
    };
    const root: ParseTree = { children: [code] };
    collapseSpaceRuns(root);
    // InlineCode is opaque — inner text must remain unchanged
    expect(code.children![0].text).toBe("x   y");
  });

  test("collapses spaces in normal text but not inside FencedCode (opaque)", () => {
    const root: ParseTree = {
      children: [
        { text: "a   b\n" },
        { type: "FencedCode", children: [{ text: "keep   me\n" }] },
        { text: "c   d\n" },
      ],
    };
    collapseSpaceRuns(root);
    const out = renderToText(root);
    expect(out).toBe("a b\nkeep   me\nc d\n");
  });
});
