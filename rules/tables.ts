import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { skipOpaque } from "../pipeline.ts";

export function alignTables(tree: ParseTree): void {
  skipOpaque(tree, (n) => {
    if (n.type !== "Table") return;
    alignOneTable(n);
  });
}

function alignOneTable(table: ParseTree) {
  // Collect header + data rows (not the separator TableDelimiter at Table level)
  const rows = collectDataRows(table);
  if (rows.length === 0) return;

  const cellsByRow = rows.map((r) => cellsOfRow(r));
  const columnCount = Math.max(...cellsByRow.map((c) => c.length));

  // Compute max content length per column (no minimum enforced here)
  const widths = new Array(columnCount).fill(0);
  for (const row of cellsByRow) {
    for (let i = 0; i < row.length; i++) {
      widths[i] = Math.max(widths[i], row[i].length);
    }
  }

  // Rebuild formatted rows
  const formattedRows = cellsByRow.map((cells) => {
    const padded = widths.map((w, i) => (cells[i] ?? "").padEnd(w));
    return "| " + padded.join(" | ") + " |";
  });

  // Build separator line: "-".repeat(w + 2) per column
  const separatorLine = "|" + widths.map((w) => "-".repeat(w + 2)).join("|") + "|";

  // Build the final text: header, separator, data rows
  const headerLine = formattedRows[0];
  const dataLines = formattedRows.slice(1);
  const trailingNewline = renderToText(table).endsWith("\n") ? "\n" : "";
  const allLines = [headerLine, separatorLine, ...dataLines];
  table.children = [{ text: allLines.join("\n") + trailingNewline }];
}

/** Returns only TableHeader and TableRow nodes (not the separator TableDelimiter). */
function collectDataRows(table: ParseTree): ParseTree[] {
  const rows: ParseTree[] = [];
  for (const c of table.children ?? []) {
    if (c.type === "TableHeader" || c.type === "TableRow") rows.push(c);
  }
  return rows;
}

function cellsOfRow(row: ParseTree): string[] {
  const cells: string[] = [];
  for (const c of row.children ?? []) {
    if (c.type === "TableCell") cells.push(renderToText(c).trim());
  }
  return cells;
}
