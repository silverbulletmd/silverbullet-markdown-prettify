// Selections are fragments: their outer whitespace separates them from text
// outside the edit. Preserve it regardless of page-formatting preferences.
export function preserveSelectionBoundaries(source: string, formatted: string): string {
  if (!source.trim()) return source;
  const leading = source.match(/^\s*/)![0];
  const trailing = source.match(/\s*$/)![0];
  return leading + formatted.trim() + trailing;
}
