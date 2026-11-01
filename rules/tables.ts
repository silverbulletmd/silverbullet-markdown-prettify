import type { ParseTree } from '@silverbulletmd/silverbullet/lib/tree';
import { normalizeTableRow, renderToText } from '@silverbulletmd/silverbullet/lib/tree';
import { replaceEditableText, skipOpaque } from '../tree.ts';

export function alignTables(tree: ParseTree): void {
  skipOpaque(tree, node => {
    if (node.type === 'Table') alignOneTable(node);
  });
}

function alignOneTable(table: ParseTree): void {
  const rows = (table.children ?? []).filter(node =>
    node.type === 'TableHeader' || node.type === 'TableRow');
  if (!rows.length) return;
  const separator = table.children?.find(node => node.type === 'TableDelimiter');
  if (!separator) return;
  const alignments = renderToText(separator).trim().replace(/^\||\|$/g, '').split('|').map(cell => ({
      left: cell.trim().startsWith(':'), right: cell.trim().endsWith(':'),
    }));
  const leadingPipe = rows[0].children?.[0]?.type === 'TableDelimiter';
  // The parser omits empty cells. Its canonical normalizer restores them
  // before widths or padding are calculated.
  for (const row of rows) normalizeTableRow(row, alignments.length, leadingPipe);
  const cellsByRow = rows.map(row => (row.children ?? []).filter(node => node.type === 'TableCell'));
  const columnCount = Math.max(alignments.length, ...cellsByRow.map(cells => cells.length));
  const widths = Array.from({ length: columnCount }, (_, i) =>
    1 + Number(alignments[i]?.left ?? false) + Number(alignments[i]?.right ?? false));
  for (const cells of cellsByRow) {
    for (let i = 0; i < cells.length; i++) {
      replaceEditableText(cells[i], /^\s+|\s+$/g, () => '');
      widths[i] = Math.max(widths[i], renderToText(cells[i]).length);
    }
  }
  for (let r = 0; r < rows.length; r++) {
    const children: ParseTree[] = [delimiter('|')];
    for (let i = 0; i < columnCount; i++) {
      const cell = cellsByRow[r][i] ?? { type: 'TableCell', children: [] };
      children.push({ text: ' ' }, cell,
        { text: ' '.repeat(widths[i] - renderToText(cell).length + 1) }, delimiter('|'));
    }
    rows[r].children = children;
  }
  const separatorText = '|' + widths.map((width, i) => {
    const left = alignments[i]?.left ? ':' : '';
    const right = alignments[i]?.right ? ':' : '';
    return left + '-'.repeat(width + 2 - left.length - right.length) + right;
  }).join('|') + '|';
  separator.children = [{ text: separatorText }];
}

function delimiter(text: string): ParseTree {
  return { type: 'TableDelimiter', children: [{ text }] };
}
