import { describe, expect, test } from "vitest";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { renderToText } from "@silverbulletmd/silverbullet/lib/tree";
import { alignTables } from "./tables.ts";
import { collapseSpaceRuns } from "./spaceRuns.ts";
import { normalizeEmphasis } from "./emphasis.ts";
import { DEFAULT_CONFIG } from "../config.ts";

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
  const columnCount = rows[0].children!.length;
  return { type: "Table", children: [
    rows[0], { text: "\n" },
    { type: "TableDelimiter", children: [{ text: "|" + "---|".repeat(columnCount) }] },
    ...rows.slice(1).flatMap(row => [{ text: "\n" }, row]),
  ] };
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


test("table layout retains inline syntax for subsequent rules and keeps its padding", () => {
  const inline: ParseTree = { type: "Emphasis", children: [
    { type: "EmphasisMark", children: [{ text: "_" }] },
    { text: "x" },
    { type: "EmphasisMark", children: [{ text: "_" }] },
  ] };
  const heading = headerRow("", "long");
  heading.children![0].children = [inline];
  const root: ParseTree = { children: [table(heading, dataRow("long", "y"))] };
  alignTables(root);
  normalizeEmphasis(root, DEFAULT_CONFIG, "");
  collapseSpaceRuns(root);
  expect(renderToText(root)).toBe("| *x*  | long |\n|------|------|\n| long | y    |");
});
