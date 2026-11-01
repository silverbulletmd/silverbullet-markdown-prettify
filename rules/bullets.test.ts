import { describe, expect, test } from "vitest";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { normalizeBullets } from "./bullets.ts";
import { DEFAULT_CONFIG } from "../config.ts";

function listMark(text: string): ParseTree {
  return { type: "ListMark", children: [{ text }] };
}

function listItem(mark: string, content: string): ParseTree {
  return {
    type: "ListItem",
    children: [listMark(mark), { text: " " + content + "\n" }],
  };
}

function bulletList(...items: ParseTree[]): ParseTree {
  return { type: "BulletList", children: items };
}

function orderedList(...items: ParseTree[]): ParseTree {
  return { type: "OrderedList", children: items };
}

describe("normalizeBullets", () => {
  test.each(["BulletList", "OrderedList"])("removes blank lines between %s items", (type) => {
    const mark = type === "BulletList" ? "*" : "1.";
    const root: ParseTree = {
      children: [
        { text: "Before\n\n" },
        { type, children: [
          { type: "ListItem", children: [listMark(mark), { text: " first" }] },
          { text: "\n \t\n\n  " },
          { type: "ListItem", children: [listMark(mark), { text: " second" }] },
        ] },
        { text: "\n\nAfter\n" },
      ],
    };
    normalizeBullets(root, DEFAULT_CONFIG);
    expect(renderToText(root)).toBe(type === "BulletList"
      ? "Before\n\n* first\n  * second\n\nAfter\n"
      : "Before\n\n1. first\n  2. second\n\nAfter\n");
  });

  test("removes blank lines before and within nested lists, preserving item paragraphs and code", () => {
    const root = bulletList({ type: "ListItem", children: [
      listMark("*"), { text: " parent" },
      { text: "\n\n  " },
      { type: "Paragraph", children: [{ text: "another paragraph" }] },
      { text: "\n\n  " },
      orderedList(
        { type: "ListItem", children: [listMark("1."), { text: " child" }] },
        { text: "\n\n  " },
        { type: "ListItem", children: [listMark("2."), { text: " next" }] },
      ),
      { text: "\n\n  " },
      { type: "FencedCode", children: [{ text: "```\na\n\nb\n```" }] },
    ] });
    normalizeBullets(root, DEFAULT_CONFIG);
    expect(renderToText(root)).toBe("* parent\n\n  another paragraph\n  1. child\n  2. next\n\n  ```\na\n\nb\n```");
  });

  test("bullet marker '-' is rewritten to '*' with default config (bulletMarker: '*')", () => {
    const list = bulletList(listItem("-", "one"), listItem("-", "two"));
    const root: ParseTree = { children: [list] };
    normalizeBullets(root, DEFAULT_CONFIG);
    const out = renderToText(root);
    expect(out).toBe("* one\n* two\n");
  });

  test("bullet marker '*' is rewritten to '-' when config sets bulletMarker: '-'", () => {
    const cfg = { ...DEFAULT_CONFIG, bulletMarker: "-" as const };
    const list = bulletList(listItem("*", "one"), listItem("*", "two"));
    const root: ParseTree = { children: [list] };
    normalizeBullets(root, cfg);
    const out = renderToText(root);
    expect(out).toBe("- one\n- two\n");
  });

  test("ordered-list marker '1)' is rewritten to '1.'", () => {
    const list = orderedList(listItem("1)", "first"), listItem("2)", "second"));
    const root: ParseTree = { children: [list] };
    normalizeBullets(root, DEFAULT_CONFIG);
    const out = renderToText(root);
    expect(out).toBe("1. first\n2. second\n");
  });

  test("ordered-list marker '1.' is left untouched", () => {
    const list = orderedList(listItem("1.", "first"), listItem("2.", "second"));
    const root: ParseTree = { children: [list] };
    normalizeBullets(root, DEFAULT_CONFIG);
    const out = renderToText(root);
    expect(out).toBe("1. first\n2. second\n");
  });

  test("ordered list is renumbered sequentially (1, 8, 3, 4 -> 1, 2, 3, 4)", () => {
    const list = orderedList(
      listItem("1.", "a"),
      listItem("8.", "b"),
      listItem("3.", "c"),
      listItem("4.", "d"),
    );
    const root: ParseTree = { children: [list] };
    normalizeBullets(root, DEFAULT_CONFIG);
    expect(renderToText(root)).toBe("1. a\n2. b\n3. c\n4. d\n");
  });

  test("ordered list preserves starting number (5, 9 -> 5, 6)", () => {
    const list = orderedList(listItem("5.", "a"), listItem("9.", "b"));
    const root: ParseTree = { children: [list] };
    normalizeBullets(root, DEFAULT_CONFIG);
    expect(renderToText(root)).toBe("5. a\n6. b\n");
  });


  test("bullet list inside a Blockquote is not touched (opaque)", () => {
    const innerList = bulletList(listItem("-", "item"));
    const root: ParseTree = {
      children: [
        { type: "Blockquote", children: [innerList] },
      ],
    };
    normalizeBullets(root, DEFAULT_CONFIG);
    // The mark inside the opaque Blockquote should still be "-"
    const mark =
      root.children![0].children![0].children![0].children![0].children![0];
    expect(mark.text).toBe("-");
  });
});
