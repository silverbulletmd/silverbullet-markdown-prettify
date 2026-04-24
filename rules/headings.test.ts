import { describe, expect, test } from "vitest";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { normalizeHeadings } from "./headings.ts";

function setextH1(title: string): ParseTree {
  return {
    type: "SetextHeading1",
    children: [
      { text: title + "\n" },
      { type: "HeaderMark", children: [{ text: "=====" }] },
    ],
  };
}

function setextH2(title: string): ParseTree {
  return {
    type: "SetextHeading2",
    children: [
      { text: title + "\n" },
      { type: "HeaderMark", children: [{ text: "-----" }] },
    ],
  };
}

function atxH1(title: string): ParseTree {
  return {
    type: "ATXHeading1",
    children: [
      { type: "HeaderMark", children: [{ text: "#" }] },
      { text: " " + title },
    ],
  };
}

describe("normalizeHeadings", () => {
  test("setext H1 (===) is rewritten to ATX #", () => {
    const heading = setextH1("My Title");
    const root: ParseTree = { children: [heading, { text: "\n" }] };
    normalizeHeadings(root);
    const out = renderToText(root);
    expect(out).toBe("# My Title\n");
  });

  test("setext H2 (---) is rewritten to ATX ##", () => {
    const heading = setextH2("Sub Heading");
    const root: ParseTree = { children: [heading, { text: "\n" }] };
    normalizeHeadings(root);
    const out = renderToText(root);
    expect(out).toBe("## Sub Heading\n");
  });

  test("existing ATX heading nodes are left untouched", () => {
    const heading = atxH1("Already ATX");
    const root: ParseTree = { children: [heading, { text: "\n" }] };
    normalizeHeadings(root);
    const out = renderToText(root);
    expect(out).toBe("# Already ATX\n");
  });

  test("setext heading inside FencedCode is not rewritten", () => {
    const setext = setextH1("Should Not Change");
    const root: ParseTree = {
      children: [
        { type: "FencedCode", children: [setext] },
      ],
    };
    normalizeHeadings(root);
    // The FencedCode node is opaque — replaceNodesMatching returns the node
    // unchanged, so the setext heading inside it keeps its original type.
    const fencedCode = root.children![0];
    expect(fencedCode.children![0].type).toBe("SetextHeading1");
  });

  test("setext H1 with inline content (title on text line) is converted correctly", () => {
    const heading: ParseTree = {
      type: "SetextHeading1",
      children: [
        { text: "Hello World\n" },
        { type: "HeaderMark", children: [{ text: "===========" }] },
      ],
    };
    const root: ParseTree = { children: [heading] };
    normalizeHeadings(root);
    const out = renderToText(root);
    expect(out).toBe("# Hello World");
  });
});
