import type { ParseTree } from '@silverbulletmd/silverbullet/lib/tree';
import { replaceEditableText, skipOpaque, textLeaves } from '../tree.ts';

export function normalizeHeadings(tree: ParseTree): void {
  skipOpaque(tree, node => {
    if (node.type !== 'SetextHeading1' && node.type !== 'SetextHeading2') return;
    // ATX headings cannot contain a protected multiline span. Keep setext
    // syntax when conversion would change code or hard-break content.
    if (textLeaves(node).some(leaf => leaf.opaque && leaf.node.text!.includes('\n'))) return;
    const level = node.type === 'SetextHeading1' ? 1 : 2;
    const children = (node.children ?? []).filter(child => child.type !== 'HeaderMark');
    // The newline before the underline is heading syntax, not inline content.
    const last = children[children.length - 1];
    // A literal trailing hash run would become an ATX closing marker.
    if (last?.text && /(?:^|\s)#+\s*$/.test(last.text)) return;
    if (last?.text !== undefined) last.text = last.text.replace(/[ \t]*\r?\n[ \t]*$/, '');
    node.children = children;
    replaceEditableText(node, /\r?\n/g, () => ' ');
    node.type = `ATXHeading${level}`;
    node.children = [
      { type: 'HeaderMark', children: [{ text: '#'.repeat(level) }] },
      { text: ' ' },
      ...children,
    ];
  });
}
