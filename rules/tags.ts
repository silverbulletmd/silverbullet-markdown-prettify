import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import {
  addParentPointers,
  collectNodesOfType,
  findNodeOfType,
  findParentMatching,
  renderToText,
} from "@silverbulletmd/silverbullet/lib/tree";
import { extractHashtag } from "@silverbulletmd/silverbullet/lib/tags";
import YAML from "js-yaml";

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

  addParentPointers(tree);
  const pageHashtags: ParseTree[] = [];
  for (const h of collectNodesOfType(tree, "Hashtag")) {
    const ancestor = findParentMatching(h, (p) =>
      p.type !== undefined && NON_PAGE_ANCESTOR_TYPES.has(p.type!)
    );
    if (ancestor) continue;
    pageHashtags.push(h);
  }
  if (pageHashtags.length === 0) return;

  const names = pageHashtags.map((h) => extractHashtag(h.children![0].text!));

  // Remove the hashtag nodes. For each removal, also normalize whitespace in
  // the surrounding sibling text nodes so we don't leave double-spaces or a
  // stray leading/trailing space in the paragraph.
  removePageHashtags(tree, new Set(pageHashtags));

  // Remove now-empty Paragraph nodes at the top level (Document children).
  // After removing all hashtags from a paragraph that contained only hashtags,
  // the paragraph is left empty — strip it and the surrounding separator text.
  pruneEmptyParagraphs(tree);

  mergeTagsIntoExistingFrontmatter(fm, names);
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
        const sep = left && right ? " " : "";
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
    } else {
      pruneEmptyParagraphs(child);
    }
  }
}

function isParagraphEmpty(para: ParseTree): boolean {
  if (!para.children || para.children.length === 0) return true;
  return para.children.every(
    (c) => c.text !== undefined && c.text.trim() === "",
  );
}

function mergeTagsIntoExistingFrontmatter(fm: ParseTree, names: string[]) {
  const codeNode = findNodeOfType(fm, "FrontMatterCode");
  if (!codeNode) return;
  const yamlText = renderToText(codeNode);
  const parsed = (YAML.load(yamlText) ?? {}) as Record<string, any>;
  const existing = normalizeTags(parsed.tags);
  const merged = dedupe([...existing, ...names]);
  parsed.tags = merged;
  const serialized = serializePreservingForm(yamlText, parsed, merged);
  codeNode.children = [{ text: serialized }];
}

function normalizeTags(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === "string") return v.trim().split(/\s+/).filter(Boolean);
  return [];
}

function dedupe(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

function serializePreservingForm(
  originalYaml: string,
  parsed: Record<string, any>,
  mergedTags: string[],
): string {
  const originalUsedList = /^tags\s*:\s*\n\s+-\s/m.test(originalYaml);
  const { tags: _omit, ...rest } = parsed;
  const restYaml = Object.keys(rest).length === 0
    ? ""
    : YAML.dump(rest).trimEnd() + "\n";
  const tagsYaml = originalUsedList
    ? "tags:\n" + mergedTags.map((t) => `  - ${t}`).join("\n") + "\n"
    : `tags: ${mergedTags.join(" ")}\n`;
  // Always emit `tags:` at the end of the frontmatter block.
  return restYaml + tagsYaml;
}
