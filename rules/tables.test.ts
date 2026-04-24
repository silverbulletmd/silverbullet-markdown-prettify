import { describe, expect, test } from "vitest";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { alignTables } from "./tables.ts";

// Build a minimal ParseTree for a pipe table. Cell text is stored as a
// single leaf; renderToText concatenates those leaves so the rule sees
// the expected content lengths.
function cell(text: string): ParseTree {
  return { type: "TableCell", children: [{ text }] };
}
function headerRow(...cells: string[]): ParseTree {
  return { type: "TableHeader", children: cells.map(cell) };
}
function dataRow(...cells: string[]): ParseTree {
  return { type: "TableRow", children: cells.map(cell) };
}
function table(...rows: ParseTree[]): ParseTree {
  return { type: "Table", children: rows };
}

describe("alignTables", () => {
  test("wide data row drives column width; header and data both pad", () => {
    const t = table(
      headerRow("Header A", "Header B"),
      dataRow("Cell A this is all very cool", "Cell B"),
    );
    const root: ParseTree = { children: [t] };
    alignTables(root);
    const out = renderToText(root);

    const expected = [
      "| Header A                     | Header B |",
      "|------------------------------|----------|",
      "| Cell A this is all very cool | Cell B   |",
    ].join("\n");

    expect(out).toBe(expected);
  });

  test("header narrower than data: header and data both pad to data width", () => {
    // Regression: reported bug where the table appeared unchanged because
    // collapseSpaceRuns was (incorrectly) running after alignTables in the
    // pipeline and collapsing the padding.
    const t = table(
      headerRow("Header A", "Header B"),
      dataRow("Cell Afe efefefef", "Cell B"),
    );
    const root: ParseTree = { children: [t] };
    alignTables(root);
    const out = renderToText(root);

    const expected = [
      "| Header A          | Header B |",
      "|-------------------|----------|",
      "| Cell Afe efefefef | Cell B   |",
    ].join("\n");

    expect(out).toBe(expected);
  });

  test("three columns with varying widths", () => {
    const t = table(
      headerRow("a", "bb", "ccc"),
      dataRow("1", "2", "3"),
      dataRow("10", "200", "3000"),
    );
    const root: ParseTree = { children: [t] };
    alignTables(root);
    const out = renderToText(root);

    const expected = [
      "| a  | bb  | ccc  |",
      "|----|-----|------|",
      "| 1  | 2   | 3    |",
      "| 10 | 200 | 3000 |",
    ].join("\n");

    expect(out).toBe(expected);
  });
});
