// Usage: node tests/generate-fixtures.mjs /path/to/silverbullet-checkout
// Use SilverBullet tag 2.6.1 (9f54b3a719dc986844dbed11547d56f7f42e9656).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const checkout = process.argv[2];
if (!checkout) throw new Error('Pass a SilverBullet 2.6.1 checkout with dependencies installed');
const version = JSON.parse(readFileSync(resolve(checkout, 'package.json'), 'utf8')).version;
if (version !== '2.6.1') throw new Error(`Expected SilverBullet 2.6.1, got ${version}`);
const temporary = mkdtempSync(join(tmpdir(), 'prettify-fixtures-'));
try {
  const outfile = join(temporary, 'parser.cjs');
  await build({ entryPoints: [resolve(checkout, 'client/markdown_parser/parser.ts')],
    bundle: true, platform: 'node', format: 'cjs', outfile });
  const { parseMarkdown } = createRequire(import.meta.url)(outfile);
  const cases = JSON.parse(readFileSync(new URL('./fixtures/cases.json', import.meta.url), 'utf8'));
  const sources = new Set(cases.flatMap(({ source, expected }) => [source, expected]));
  const trees = Object.fromEntries([...sources].map(source => [source, parseMarkdown(source)]));
  writeFileSync(new URL('./fixtures/trees.json', import.meta.url), JSON.stringify(trees, null, 2) + '\n');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
