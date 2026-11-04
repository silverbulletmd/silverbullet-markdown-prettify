export type PrettifyConfig = {
  unwrapSoftWrappedParagraphs: boolean;
  normalizeHeadings: boolean;
  normalizeBullets: boolean;
  bulletMarker: "*" | "-" | "+";
  normalizeEmphasis: boolean;
  emphasisMarker: "*" | "_";
  strongMarker: "*" | "_";
  smartQuotes: boolean;
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
  smartQuotes: true,
  collapseSpaceRuns: true,
  normalizeWikilinks: true,
  alignTables: true,
  liftPageTagsToFrontmatter: true,
  trimTrailingWhitespace: true,
  collapseBlankLines: true,
  ensureTrailingNewline: true,
};

export type Scope = "page" | "selection";
