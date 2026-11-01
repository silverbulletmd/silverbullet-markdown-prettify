import { describe, expect, test } from "vitest";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { liftPageTagsToFrontmatter } from "./tags.ts";

function hashtag(name: string): ParseTree {
  // extractHashtag strips the '#' prefix from the text child
  return { type: "Hashtag", children: [{ text: "#" + name }] };
}

function frontmatter(yamlContent: string): ParseTree {
  return {
    type: "FrontMatter",
    children: [
      { type: "FrontMatterMarker", children: [{ text: "---\n" }] },
      { type: "FrontMatterCode", children: [{ text: yamlContent }] },
      { type: "FrontMatterMarker", children: [{ text: "---\n" }] },
    ],
  };
}

describe("liftPageTagsToFrontmatter", () => {
  test("no frontmatter + top-level hashtag → tag left in place (lift skipped)", () => {
    const tag = hashtag("foo");
    const para: ParseTree = {
      type: "Paragraph",
      children: [{ text: "" }, tag, { text: "\n" }],
    };
    const root: ParseTree = { children: [para] };
    liftPageTagsToFrontmatter(root);
    const out = renderToText(root);
    // With no frontmatter present, lifting is a no-op. The hashtag stays.
    expect(out).not.toContain("---");
    expect(out).toContain("#foo");
  });

  test("existing frontmatter with string-form tags + new hashtag → merged", () => {
    const fm = frontmatter("tags: foo\n");
    const tag = hashtag("bar");
    const para: ParseTree = {
      type: "Paragraph",
      children: [{ text: "" }, tag, { text: "\n" }],
    };
    const root: ParseTree = {
      children: [fm, { text: "\n" }, para],
    };
    liftPageTagsToFrontmatter(root);
    const out = renderToText(root);
    expect(out).toContain("tags: foo bar");
  });

  test("existing frontmatter with list-form tags + new hashtag → list form preserved", () => {
    const fm = frontmatter("tags:\n  - foo\n");
    const tag = hashtag("bar");
    const para: ParseTree = {
      type: "Paragraph",
      children: [{ text: "" }, tag, { text: "\n" }],
    };
    const root: ParseTree = {
      children: [fm, { text: "\n" }, para],
    };
    liftPageTagsToFrontmatter(root);
    const out = renderToText(root);
    // List form should be preserved
    expect(out).toContain("tags:");
    expect(out).toContain("  - foo");
    expect(out).toContain("  - bar");
  });

  test("hashtag inside Blockquote is not lifted (blockquote ancestor excludes it)", () => {
    const tag = hashtag("notlifted");
    const para: ParseTree = {
      type: "Paragraph",
      children: [{ text: "" }, tag, { text: "\n" }],
    };
    const blockquote: ParseTree = {
      type: "Blockquote",
      children: [para],
    };
    const root: ParseTree = { children: [frontmatter("tags: foo\n"), blockquote] };
    liftPageTagsToFrontmatter(root);
    const out = renderToText(root);
    expect(out).toContain("#notlifted");
    expect(out).toContain("tags: foo\n");
  });

  test("tags: is placed at the end of the frontmatter block", () => {
    const fm = frontmatter("title: Hello\ndescription: A note\n");
    const tag = hashtag("foo");
    const para: ParseTree = {
      type: "Paragraph",
      children: [{ text: "" }, tag, { text: "\n" }],
    };
    const root: ParseTree = {
      children: [fm, { text: "\n" }, para],
    };
    liftPageTagsToFrontmatter(root);
    const out = renderToText(root);
    // The `tags:` line should come after title/description, not before.
    const titleIdx = out.indexOf("title: Hello");
    const tagsIdx = out.indexOf("tags: foo");
    expect(titleIdx).toBeGreaterThanOrEqual(0);
    expect(tagsIdx).toBeGreaterThan(titleIdx);
  });

  test("hashtag inside BulletList is not lifted", () => {
    const tag = hashtag("listitem");
    const listItem: ParseTree = {
      type: "ListItem",
      children: [
        { type: "ListMark", children: [{ text: "*" }] },
        { text: " " },
        tag,
        { text: "\n" },
      ],
    };
    const list: ParseTree = {
      type: "BulletList",
      children: [listItem],
    };
    const root: ParseTree = { children: [frontmatter("tags: foo\n"), list] };
    liftPageTagsToFrontmatter(root);
    const out = renderToText(root);
    expect(out).toContain("#listitem");
    expect(out).toContain("tags: foo\n");
  });
});

test.each(['[one, two]\n', '42\n', 'tags: {bad: value}\n', 'tags: [foo, {bad: value}]\n', 'tags: [\n'])(
  'invalid frontmatter is rejected before any tags are removed: %s', yaml => {
    const root: ParseTree = { children: [frontmatter(yaml),
      { type: 'Paragraph', children: [hashtag('foo')] }] };
    const before = renderToText(root);
    expect(() => liftPageTagsToFrontmatter(root)).toThrow();
    expect(renderToText(root)).toBe(before);
  },
);

test('missing frontmatter code leaves body tags intact', () => {
  const root: ParseTree = { children: [
    { type: 'FrontMatter', children: [{ text: '---\n---\n' }] },
    { type: 'Paragraph', children: [hashtag('foo')] },
  ] };
  const before = renderToText(root);
  liftPageTagsToFrontmatter(root);
  expect(renderToText(root)).toBe(before);
});
