---
name: Library/silverbulletmd/markdown-prettify/Prettify
tags: meta/library
files:
- markdown-prettify.plug.js
---
Adds a `Markdown: Prettify` command (default binding `Ctrl-Alt-p` / `Cmd-Alt-p`) that cleans up the current page (or selection) using an ordered pipeline of opinionated, ParseTree-based rules:

* Convert setext (`===` / `---`) headings to ATX (`#`) when their inline content can be preserved (multiline code and literal closing hashes keep setext syntax)
* Unwrap soft-wrapped paragraphs (the editor handles wrapping)
* Normalize bullet markers; renumber ordered lists sequentially (preserving the starting value); `N)` is normalized to `N.`; remove blank lines between list items and before nested lists
* Normalize emphasis markers (with a mid-word `*` safety override)
* Trim whitespace inside wikilinks (`[[ Foo | Bar ]]` → `[[Foo|Bar]]`)
* Align pipe tables to uniform column widths, preserving alignment markers and empty cells
* Convert straight quotes and apostrophes to curly quotes using SilverBullet’s context rules
* Collapse runs of spaces (outside code), preserving leading indentation
* Lift page-level hashtags into the frontmatter `tags:` key (only when the page already has a frontmatter block — no frontmatter is created out of thin air)
* Trim trailing whitespace, collapse 3+ blank lines, remove blank lines below headings and at page boundaries, ensure one trailing newline outside protected blocks

Parser-recognized code blocks, inline code, math, HTML, blockquotes, transclusions, and Lua directives are protected from edits. Existing frontmatter YAML is untouched unless tags are lifted. Tag lifting preserves tag values using YAML serialization; invalid frontmatter or tag types abort the command before any editor edit. At EOF, preserving a protected block takes precedence over adding a trailing newline.

When a selection is active the command operates on the selection, preserves its leading and trailing whitespace, and skips the page-level tag-lift rule. A selection never gains a trailing newline. Otherwise it runs on the full page. A single `replaceRange` call means undo reverts the whole prettification in one step.

## Configuration
See the "Markdown Prettify" section in the Configuration Manager.

## Configuration schema
```space-lua
-- priority: 100

config.defineCategory {
  name = "Markdown Prettify",
  description = "Rules used by the Markdown: Prettify command.",
  order = 60,
}

config.define("markdownPrettify", {
  description = "Rules for the Markdown: Prettify command.",
  type = "object",
  properties = {
    unwrapSoftWrappedParagraphs = {
      type = "boolean", default = true,
      description = "Join soft-wrapped paragraph lines into single lines (the editor handles wrapping).",
      ui = { category = "Markdown Prettify", label = "Unwrap soft-wrapped paragraphs", order = 1 },
    },
    normalizeHeadings = {
      type = "boolean", default = true,
      description = "Convert setext (=== / ---) headings to ATX (#).",
      ui = { category = "Markdown Prettify", label = "Normalize headings", order = 2 },
    },
    normalizeBullets = {
      type = "boolean", default = true,
      description = "Normalize bullet markers and ordered-list style; remove blank lines between list items and before nested lists.",
      ui = { category = "Markdown Prettify", label = "Normalize bullets", order = 3 },
    },
    bulletMarker = {
      type = "string", enum = {"*", "-", "+"}, default = "*",
      description = "Canonical bullet marker.",
      ui = { category = "Markdown Prettify", label = "Bullet marker", order = 4 },
    },
    normalizeEmphasis = {
      type = "boolean", default = true,
      ui = { category = "Markdown Prettify", label = "Normalize emphasis", order = 5 },
    },
    emphasisMarker = {
      type = "string", enum = {"*", "_"}, default = "*",
      ui = { category = "Markdown Prettify", label = "Italic marker", order = 6 },
    },
    strongMarker = {
      type = "string", enum = {"*", "_"}, default = "*",
      ui = { category = "Markdown Prettify", label = "Bold marker", order = 7 },
    },
    smartQuotes = {
      type = "boolean", default = true,
      description = "Convert straight quotes and apostrophes to curly quotes in prose.",
      ui = { category = "Markdown Prettify", label = "Smart quotes", order = 15 },
    },
    collapseSpaceRuns = {
      type = "boolean", default = true,
      ui = { category = "Markdown Prettify", label = "Collapse space runs", order = 8 },
    },
    normalizeWikilinks = {
      type = "boolean", default = true,
      ui = { category = "Markdown Prettify", label = "Normalize wikilinks", order = 9 },
    },
    alignTables = {
      type = "boolean", default = true,
      ui = { category = "Markdown Prettify", label = "Align tables", order = 10 },
    },
    liftPageTagsToFrontmatter = {
      type = "boolean", default = true,
      description = "Move page-level hashtags into the frontmatter tags: key.",
      ui = { category = "Markdown Prettify", label = "Lift page tags to frontmatter", order = 11 },
    },
    trimTrailingWhitespace = {
      type = "boolean", default = true,
      ui = { category = "Markdown Prettify", label = "Trim trailing whitespace", order = 12 },
    },
    collapseBlankLines = {
      type = "boolean", default = true,
      description = "Collapse 3+ consecutive blank lines to one; remove blank lines below headings and at page boundaries.",
      ui = { category = "Markdown Prettify", label = "Collapse blank lines", order = 13 },
    },
    ensureTrailingNewline = {
      type = "boolean", default = true,
      ui = { category = "Markdown Prettify", label = "Ensure trailing newline", order = 14 },
    },
  },
  additionalProperties = false,
})
```
