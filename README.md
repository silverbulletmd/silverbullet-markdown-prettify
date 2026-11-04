# silverbullet-markdown-prettify
SilverBullet library that cleans up markdown in an opinionated (and SilverBullet optimized) way. It adds a `Markdown: Prettify` command (default `Ctrl-Alt-p` / `Cmd-Alt-p`) to clean up the current page (or selection) using an ordered pipeline of ParseTree-based rules.

See [Prettify.md](./Prettify.md) for a full description of the rules, configuration schema, and install instructions.

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
npm test
```

The suite covers individual rules, complete pipeline output and idempotence, and editor selection behavior. Integration tests use committed trees produced by SilverBullet 2.6.1's real markdown parser; CI does not need its internal parser sources.

To add parser-backed cases, edit `tests/fixtures/cases.json` with hand-checked input and expected output, then regenerate both sets of trees:

```bash
npm run fixtures -- /path/to/silverbullet-2.6.1-checkout
npm test
```

The checkout must have its dependencies installed. The smart quote fixtures were captured from the local SilverBullet 2.12.1 parser. Earlier fixture provenance: SilverBullet tag `2.6.1`, commit `9f54b3a719dc986844dbed11547d56f7f42e9656`. `tests/fixtures/trees.json` is generated; do not edit it by hand.

Rules share configuration types in `config.ts` and protected-tree traversal in `tree.ts`. Keep inline syntax nodes intact until final rendering so later rules can still recognize emphasis, links, tags, and table cells.

## Development
1. In your SilverBullet space, create a namespace folder, e.g. `Library/zefhemel/`.
2. Symlink this repo into it:
   ```bash
   ln -s "$PWD" ~/myspace/Library/silverbulletmd/markdown-prettify
   ```
3. Run `npm run build` whenever you change source files; SilverBullet reloads the plug automatically (or run `Plugs: Reload` to force).

## License
MIT
