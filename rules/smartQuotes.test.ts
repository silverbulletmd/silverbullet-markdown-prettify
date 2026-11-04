import { expect, test } from "vitest";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { smartQuotes } from "./smartQuotes.ts";
import { OPAQUE_TYPES } from "../tree.ts";

test.each([...OPAQUE_TYPES, "Attribute", "URL", "LinkTitle", "WikiLinkPage", "Escape"])(
  "preserves quotes inside %s while converting adjacent prose", (type) => {
    const tree: ParseTree = { children: [
      { text: '"before" ' },
      { type, children: [{ text: '"literal" and \'literal\'' }] },
      { text: ' "after"' },
    ] };
    smartQuotes(tree);
    expect(renderToText(tree)).toBe('“before” "literal" and \'literal\' “after”');
  },
);

test("uses SilverBullet punctuation context across text nodes", () => {
  const tree: ParseTree = { children: [
    { text: '("hello"), ' }, { text: 'don\'t!" ' },
    { text: '“\'nested\'”' },
  ] };
  smartQuotes(tree);
  expect(renderToText(tree)).toBe('(“hello”), don’t!” “’nested’”');
});
