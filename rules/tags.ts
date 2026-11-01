import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import {
  findNodeOfType,
  renderToText,
} from "@silverbulletmd/silverbullet/lib/tree";
import { extractHashtag } from "@silverbulletmd/silverbullet/lib/tags";
import YAML from "js-yaml";
import { OPAQUE_TYPES } from "../tree.ts";

const NON_PAGE_ANCESTOR_TYPES = new Set([
  "BulletList",
  "OrderedList",
  "Task",
  "Table",
  "Blockquote",
]);

export function liftPageTagsToFrontmatter(tree: ParseTree): void {
  // Only lift when the page already has frontmatter. Creating frontmatter
  // out of thin air is a structural change the user may not expect, so we
  // require them to opt in by having one.
  const fm = findNodeOfType(tree, "FrontMatter");
  if (!fm) return;

  const codeNode = findNodeOfType(fm, "FrontMatterCode");
  if (!codeNode) return;
  const pageHashtags: ParseTree[] = [];
  function collect(node: ParseTree): void {
    if (node.type && (OPAQUE_TYPES.has(node.type) || NON_PAGE_ANCESTOR_TYPES.has(node.type))) return;
    if (node.type === "Hashtag") pageHashtags.push(node);
    else for (const child of node.children ?? []) collect(child);
  }
  collect(tree);
  if (pageHashtags.length === 0) return;

  const names = pageHashtags.map(h => extractHashtag(renderToText(h)));
  // Validate and serialize first: a malformed mapping or tag value must not
  // leave the body half edited, even when this rule is called independently.
  const serialized = mergeTags(renderToText(codeNode), names);

  // Remove the hashtag nodes. For each removal, also normalize whitespace in
  // the surrounding sibling text nodes so we don't leave double-spaces or a
  // stray leading/trailing space in the paragraph.
  removePageHashtags(tree, new Set(pageHashtags));

  // Remove now-empty Paragraph nodes at the top level (Document children).
  // After removing all hashtags from a paragraph that contained only hashtags,
  // the paragraph is left empty — strip it and the surrounding separator text.
  pruneEmptyParagraphs(tree);

  codeNode.children = [{ text: serialized }];
}

function removePageHashtags(tree: ParseTree, targets: Set<ParseTree>): void {
  if (!tree.children) return;
  for (let i = 0; i < tree.children.length; i++) {
    const child = tree.children[i];
    if (targets.has(child)) {
      const prev = tree.children[i - 1];
      const next = tree.children[i + 1];
      // If both sides are plain text, join them and clean up the whitespace at
      // the seam: collapse double spaces and trim leading/trailing spaces that
      // were only there to separate the now-removed hashtag.
      if (prev && prev.text !== undefined && next && next.text !== undefined) {
        const left = prev.text.replace(/ +$/, "");
        const right = next.text.replace(/^ +/, "");
        const hasLeftContent = left.length > 0 || i > 1;
        const hasRightContent = right.length > 0 || i + 2 < tree.children.length;
        const sep = hasLeftContent && hasRightContent ? " " : "";
        prev.text = left + sep + right;
        tree.children.splice(i, 2);
        i -= 1;
        continue;
      }
      if (prev && prev.text !== undefined) {
        prev.text = prev.text.replace(/ +$/, "");
      }
      if (next && next.text !== undefined) {
        next.text = next.text.replace(/^ +/, "");
      }
      tree.children.splice(i, 1);
      i -= 1;
      continue;
    }
    removePageHashtags(child, targets);
  }
}

/** Remove empty Paragraph nodes (all children are empty-text) from the tree.
 * When removing an empty paragraph that was followed by an inter-paragraph
 * separator text node (e.g. "\n\n"), consume one leading "\n" from that
 * separator so that the blank line the paragraph itself occupied is reclaimed.
 */
function pruneEmptyParagraphs(tree: ParseTree): void {
  if (!tree.children) return;
  for (let i = 0; i < tree.children.length; i++) {
    const child = tree.children[i];
    if (child.type === "Paragraph" && isParagraphEmpty(child)) {
      // If the next sibling is a plain-text separator starting with "\n",
      // strip one "\n" from it (the paragraph no longer occupies a line).
      const next = tree.children[i + 1];
      if (next && next.text !== undefined && next.text.startsWith("\n")) {
        next.text = next.text.slice(1);
        if (next.text === "") {
          tree.children.splice(i + 1, 1);
        }
      }
      tree.children.splice(i, 1);
      i -= 1;
    }
  }
}

function isParagraphEmpty(para: ParseTree): boolean {
  if (!para.children || para.children.length === 0) return true;
  return para.children.every(
    (c) => c.text !== undefined && c.text.trim() === "",
  );
}

function mergeTags(yamlText: string, names: string[]): string {
  const parsed: unknown = YAML.load(yamlText) ?? {};
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed) ||
    (Object.getPrototypeOf(parsed) !== Object.prototype && Object.getPrototypeOf(parsed) !== null)) {
    throw new Error("Frontmatter must be a YAML mapping");
  }
  const { tags, ...rest } = parsed as Record<string, unknown>;
  const existing = normalizeTags(tags);
  const merged = [...new Set([...existing, ...names])];
  // Keep string-form tags when whitespace cannot make their boundaries
  // ambiguous. Existing arrays stay arrays, including flow-style arrays.
  const value = Array.isArray(tags) || merged.some(tag => /\s/.test(tag))
    ? merged : merged.join(" ");
  return YAML.dump({ ...rest, tags: value }, { lineWidth: -1 });
}

function normalizeTags(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === "string") return value.trim().split(/\s+/).filter(Boolean);
  if (Array.isArray(value) && value.every(tag => typeof tag === "string")) return value;
  throw new Error("Frontmatter tags must be a string or a list of strings");
}
