import type { ParseTree } from '@silverbulletmd/silverbullet/lib/tree';
import trees from './fixtures/trees.json';

// Captured from the real SilverBullet parser, not synthesized by the tests.
// Fail on missing fixtures so an untested parser assumption cannot silently pass.
export function parseFixture(source: string): ParseTree {
  const tree = (trees as Record<string, ParseTree>)[source];
  if (!tree) throw new Error(`Missing parser fixture: ${JSON.stringify(source)}`);
  return structuredClone(tree);
}
