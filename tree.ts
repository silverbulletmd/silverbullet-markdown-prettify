import type { ParseTree } from '@silverbulletmd/silverbullet/lib/tree';

const OPAQUE_BLOCK_TYPES = new Set([
  'FencedCode', 'CodeBlock', 'HTMLBlock', 'Blockquote', 'FrontMatter', 'MathBlock', 'DisplayMath',
]);
export const OPAQUE_TYPES = new Set([
  ...OPAQUE_BLOCK_TYPES, 'InlineCode', 'HTMLTag', 'HardBreak', 'Image',
  'LuaDirective', 'InlineMath', 'Transclusion',
]);

export function endsInOpaqueBlock(tree: ParseTree): boolean {
  if (tree.type && OPAQUE_BLOCK_TYPES.has(tree.type)) return true;
  const last = tree.children?.findLast(child => child.text !== '');
  return last !== undefined && endsInOpaqueBlock(last);
}

export function skipOpaque(tree: ParseTree, visit: (node: ParseTree) => void): void {
  if (tree.type && OPAQUE_TYPES.has(tree.type)) return;
  visit(tree);
  for (const child of tree.children ?? []) skipOpaque(child, visit);
}

// Positions describe the CURRENT leaves, never the parser's original offsets.
// Keeping those offsets intact lets later syntax rules still consult the source.
export function textLeaves(tree: ParseTree) {
  const leaves: { node: ParseTree; from: number; to: number; opaque: boolean }[] = [];
  let position = 0;
  function walk(node: ParseTree, opaque: boolean) {
    opaque ||= node.type !== undefined && OPAQUE_TYPES.has(node.type);
    if (node.text !== undefined) {
      const from = position;
      position += node.text.length;
      leaves.push({ node, from, to: position, opaque });
    } else {
      for (const child of node.children ?? []) walk(child, opaque);
    }
  }
  walk(tree, false);
  return leaves;
}

// Apply text edits only when every touched leaf is editable. Matches may cross
// text-node boundaries, but can never cross into protected syntax.
export function replaceEditableText(
  tree: ParseTree,
  pattern: RegExp,
  replacement: (match: RegExpExecArray, text: string) => string,
): void {
  const leaves = textLeaves(tree);
  const text = leaves.map(({ node }) => node.text).join('');
  const matches = [...text.matchAll(pattern)];
  let leafIndex = leaves.length - 1;
  for (const match of matches.reverse()) {
    const from = match.index!;
    const to = from + match[0].length;
    while (leafIndex >= 0 && leaves[leafIndex].from >= to) leafIndex--;
    let first = leafIndex;
    while (first >= 0 && leaves[first].to > from) first--;
    const touched = leaves.slice(first + 1, leafIndex + 1);
    if (touched.length === 0 || touched.some(leaf => leaf.opaque)) continue;
    const value = replacement(match, text);
    for (let i = 0; i < touched.length; i++) {
      const leaf = touched[i];
      const start = Math.max(0, from - leaf.from);
      const end = Math.min(leaf.to - leaf.from, to - leaf.from);
      leaf.node.text = leaf.node.text!.slice(0, start) + (i === 0 ? value : '') +
        leaf.node.text!.slice(end);
    }
  }
}
