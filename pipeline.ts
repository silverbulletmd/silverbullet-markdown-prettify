import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { markdown } from "@silverbulletmd/silverbullet/syscalls";
import { normalizeHeadings } from "./rules/headings.ts";
import {
  finalizeWhitespace,
  normalizeBlankLines,
  unwrapSoftWrappedParagraphs,
} from "./rules/whitespace.ts";
import { normalizeBullets } from "./rules/bullets.ts";
import { normalizeEmphasis } from "./rules/emphasis.ts";
import { normalizeWikilinks } from "./rules/wikilinks.ts";
import { alignTables } from "./rules/tables.ts";
import { smartQuotes } from "./rules/smartQuotes.ts";
import { collapseSpaceRuns } from "./rules/spaceRuns.ts";
import { liftPageTagsToFrontmatter } from "./rules/tags.ts";

import { preserveSelectionBoundaries } from "./boundaries.ts";
import type { PrettifyConfig, Scope } from "./config.ts";

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
  if (cfg.collapseSpaceRuns) collapseSpaceRuns(tree);
  if (cfg.smartQuotes) smartQuotes(tree);
  if (cfg.alignTables) alignTables(tree);
  if (scope === "page" && cfg.liftPageTagsToFrontmatter) {
    liftPageTagsToFrontmatter(tree);
  }
  if (cfg.collapseBlankLines) normalizeBlankLines(tree, scope);
  finalizeWhitespace(tree, cfg, scope);
  const rendered = renderToText(tree);
  return scope === "selection" ? preserveSelectionBoundaries(source, rendered) : rendered;
}
