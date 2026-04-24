import { describe, expect, test } from "vitest";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { normalizeWikilinks } from "./wikilinks.ts";

function wikiLinkMark(text: string): ParseTree {
  return { type: "WikiLinkMark", children: [{ text }] };
}

function simpleWikiLink(pageText: string): ParseTree {
  return {
    type: "WikiLink",
    children: [
      wikiLinkMark("[["),
      { type: "WikiLinkPage", children: [{ text: pageText }] },
      wikiLinkMark("]]"),
    ],
  };
}

function aliasedWikiLink(pageText: string, aliasText: string): ParseTree {
  return {
    type: "WikiLink",
    children: [
      wikiLinkMark("[["),
      { type: "WikiLinkPage", children: [{ text: pageText }] },
      wikiLinkMark("|"),
      { type: "WikiLinkAlias", children: [{ text: aliasText }] },
      wikiLinkMark("]]"),
    ],
  };
}

describe("normalizeWikilinks", () => {
  test("trims leading and trailing spaces inside a simple wikilink", () => {
    const link = simpleWikiLink(" Foo ");
    const root: ParseTree = { children: [link] };
    normalizeWikilinks(root);
    const out = renderToText(root);
    expect(out).toBe("[[Foo]]");
  });

  test("trims spaces around page and alias in a wikilink with alias", () => {
    const link = aliasedWikiLink("Foo ", " Bar");
    const root: ParseTree = { children: [link] };
    normalizeWikilinks(root);
    const out = renderToText(root);
    expect(out).toBe("[[Foo|Bar]]");
  });

  test("leaves already-clean wikilinks unchanged", () => {
    const link = simpleWikiLink("CleanPage");
    const root: ParseTree = { children: [link] };
    normalizeWikilinks(root);
    const out = renderToText(root);
    expect(out).toBe("[[CleanPage]]");
  });

  test("trims only page text when alias is already clean", () => {
    const link = aliasedWikiLink("  Spaced Page  ", "Clean Alias");
    const root: ParseTree = { children: [link] };
    normalizeWikilinks(root);
    const out = renderToText(root);
    expect(out).toBe("[[Spaced Page|Clean Alias]]");
  });
});
