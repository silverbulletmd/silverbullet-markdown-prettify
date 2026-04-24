import { describe, expect, test } from "vitest";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { collapseSpaceRuns } from "./spaceRuns.ts";

describe("collapseSpaceRuns", () => {
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
