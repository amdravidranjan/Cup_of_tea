/**
 * CSV reading, to RFC 4180.
 *
 * Hand-rolled rather than pulled in as a dependency because the rules are
 * small and the failure modes matter: a quoted field containing a comma is a
 * survey number list, and a naive split would silently shear it in half.
 */

import { UnreadableFileError, type ParseResult, type RawRow } from "./types";

/** Splits CSV text into rows of cells, honouring quotes and embedded newlines. */
export function parseCsvGrid(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  // A byte-order mark survives most exports from Excel and would otherwise
  // become part of the first column heading, so no field would ever match it.
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    cell += char;
    i++;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/**
 * Turns a grid into headed rows.
 *
 * Row numbers are the ones a spreadsheet shows — the header is row 1, so the
 * first data row is row 2. An error that says "row 14" has to mean the row
 * the officer sees when they open the file, or it is not actionable.
 */
export function gridToRows(grid: string[][], method: string): ParseResult {
  const warnings: string[] = [];
  const nonEmpty = grid.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) {
    throw new UnreadableFileError(
      "The file has no rows.",
      "Fill in the template and upload it again."
    );
  }

  const headerIndex = grid.findIndex((r) => r.some((c) => c.trim() !== ""));
  const headers = grid[headerIndex].map((h) => h.trim());
  if (headers.every((h) => h === "")) {
    throw new UnreadableFileError(
      "The first row is blank, so there are no column headings to read.",
      "Put the column headings in the first row, as the template does."
    );
  }

  const rows: RawRow[] = [];
  for (let i = headerIndex + 1; i < grid.length; i++) {
    const cells = grid[i];
    if (!cells.some((c) => c.trim() !== "")) continue;

    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) record[header] = (cells[index] ?? "").trim();
    });
    if (cells.length > headers.length) {
      warnings.push(
        `Row ${i + 1} has ${cells.length} values but there are only ${headers.length} column headings; the extra values were ignored.`
      );
    }
    rows.push({ rowNumber: i + 1, cells: record });
  }

  if (rows.length === 0) {
    throw new UnreadableFileError(
      "The file has column headings but no data rows beneath them.",
      "Add one row per record under the headings."
    );
  }

  return { rows, headers: headers.filter(Boolean), method, warnings };
}

export function parseCsv(text: string): ParseResult {
  return gridToRows(parseCsvGrid(text), "CSV");
}
