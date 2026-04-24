# silverbullet-markdown-prettify

SilverBullet library that cleans up markdown in an opinionated (and SilverBullet optimized) way. It adds a `Markdown: Prettify` command (default `Ctrl-Alt-p` / `Cmd-Alt-p`) to clean up the current page (or selection) using an ordered pipeline of ParseTree-based rules.

See [MarkdownPrettify.md](./MarkdownPrettify.md) for a full description of the rules, configuration schema, and install instructions.

## Install

In SilverBullet, run `Library: Install` and paste the URL to `Prettify.md` in this repo.

## Build

```bash
npm install
npm run build
```

This produces `markdown-prettify.plug.js` next to the source files, which the SilverBullet client will pick up automatically (watch the browser console, then run `Plugs: Reload`).

## Tests

```bash
npx vitest run
```

Only the pure string-level `finalizeWhitespace` tests ship in this standalone repo — the ParseTree-based rule tests require SilverBullet's internal markdown parser and run inside Core instead.

## Development

1. In your SilverBullet space, create a namespace folder, e.g. `Library/zefhemel/`.
2. Symlink this repo into it:
   ```bash
   ln -s "$PWD" ~/myspace/Library/zefhemel/markdown-prettify
   ```
3. Run `npm run build` whenever you change source files; SilverBullet reloads the plug automatically (or run `Plugs: Reload` to force).

## License

MIT
