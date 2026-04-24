import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { markdown } from "@silverbulletmd/silverbullet/syscalls";
import { normalizeHeadings } from "./rules/headings.ts";
import {
  finalizeWhitespace,
  unwrapSoftWrappedParagraphs,
} from "./rules/whitespace.ts";
import { normalizeBullets } from "./rules/bullets.ts";
import { normalizeEmphasis } from "./rules/emphasis.ts";
import { normalizeWikilinks } from "./rules/wikilinks.ts";
import { alignTables } from "./rules/tables.ts";
import { collapseSpaceRuns } from "./rules/spaceRuns.ts";
import { liftPageTagsToFrontmatter } from "./rules/tags.ts";

export type PrettifyConfig = {
  unwrapSoftWrappedParagraphs: boolean;
  normalizeHeadings: boolean;
  normalizeBullets: boolean;
  bulletMarker: "*" | "-" | "+";
  normalizeEmphasis: boolean;
  emphasisMarker: "*" | "_";
  strongMarker: "*" | "_";
  collapseSpaceRuns: boolean;
  normalizeWikilinks: boolean;
  alignTables: boolean;
  liftPageTagsToFrontmatter: boolean;
  trimTrailingWhitespace: boolean;
  collapseBlankLines: boolean;
  ensureTrailingNewline: boolean;
};

export const DEFAULT_CONFIG: PrettifyConfig = {
  unwrapSoftWrappedParagraphs: true,
  normalizeHeadings: true,
  normalizeBullets: true,
  bulletMarker: "*",
  normalizeEmphasis: true,
  emphasisMarker: "*",
  strongMarker: "*",
  collapseSpaceRuns: true,
  normalizeWikilinks: true,
  alignTables: true,
  liftPageTagsToFrontmatter: true,
  trimTrailingWhitespace: true,
  collapseBlankLines: true,
  ensureTrailingNewline: true,
};

export const OPAQUE_TYPES = new Set<string>([
  "FencedCode",
  "CodeBlock",
  "InlineCode",
  "HTMLBlock",
  "HTMLTag",
  "Blockquote",
  "FrontMatter",
]);

// Walk the tree, invoking `visit` on every node that is NOT inside an opaque subtree.
export function skipOpaque(
  tree: ParseTree,
  visit: (n: ParseTree) => void,
): void {
  visit(tree);
  if (!tree.children) return;
  for (const child of tree.children) {
    if (child.type && OPAQUE_TYPES.has(child.type)) continue;
    skipOpaque(child, visit);
  }
}

export type Scope = "page" | "selection";

export async function runPipeline(
  source: string,
  cfg: PrettifyConfig,
  scope: Scope,
): Promise<string> {
  const tree = await markdown.parseMarkdown(source);
  if (cfg.normalizeHeadings) normalizeHeadings(tree);
  if (cfg.unwrapSoftWrappedParagraphs) unwrapSoftWrappedParagraphs(tree);
  if (cfg.normalizeBullets) normalizeBullets(tree, cfg);
  if (cfg.normalizeEmphasis) normalizeEmphasis(tree, cfg, source);
  if (cfg.normalizeWikilinks) normalizeWikilinks(tree);
  // collapseSpaceRuns must run BEFORE alignTables: it walks all text nodes,
  // and the single text node alignTables produces for a formatted table
  // contains intentional runs of padding spaces that we must not collapse.
  if (cfg.collapseSpaceRuns) collapseSpaceRuns(tree);
  if (cfg.alignTables) alignTables(tree);
  if (scope === "page" && cfg.liftPageTagsToFrontmatter) {
    liftPageTagsToFrontmatter(tree);
  }
  const rendered = renderToText(tree);
  return finalizeWhitespace(rendered, cfg);
}
