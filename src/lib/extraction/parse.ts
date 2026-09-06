/**
 * Reading a file into rows, whatever it arrived as.
 *
 * Four formats, one contract: give back headed rows or throw an
 * `UnreadableFileError` that says why and what to send instead. Nothing here
 * ever invents a value — a file that cannot be read is rejected, which is the
 * behaviour the previous hash-derived "reader" got wrong.
 *
 * Server-only: the parsers pull in Node-side libraries and are called from
 * API routes, never from the browser.
 */

import { parseCsv, gridToRows } from "./parse-csv";
import { UnreadableFileError, type ParseResult } from "./types";

/** What the file input advertises and what the server will attempt. */
export const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".docx", ".pdf"] as const;

export const ACCEPT_ATTRIBUTE = [
  ".csv",
  "text/csv",
  ".xlsx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".docx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pdf",
  "application/pdf",
].join(",");

/** Uploads are capped so a mis-drop cannot exhaust the server's memory. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".gif", ".webp", ".heic"]);

/**
 * Reads any accepted file into rows.
 *
 * The refusals matter as much as the successes. A photograph of a patta is
 * rejected by name, with the reason and the alternative — rule-based
 * extraction needs machine-readable text, and pretending otherwise is how the
 * old reader ended up fabricating owners.
 */
export async function parseFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ParseResult> {
  const extension = extensionOf(fileName);

  if (IMAGE_EXTENSIONS.has(extension) || mimeType.startsWith("image/")) {
    throw new UnreadableFileError(
      `${fileName} is an image, which carries no machine-readable text.`,
      "This reads text, not pictures of text. Export the digital extract from e-Sevai, or fill in the template for this document type."
    );
  }
  if (extension === ".txt") {
    throw new UnreadableFileError(
      "Plain text files are not an accepted record format.",
      "No revenue office issues a .txt. Upload the CSV, XLSX, DOCX or text-layer PDF you were given, or fill in the template."
    );
  }
  if (buffer.byteLength === 0) {
    throw new UnreadableFileError(
      `${fileName} is empty.`,
      "Check the file saved correctly and upload it again."
    );
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new UnreadableFileError(
      `${fileName} is larger than the ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB limit.`,
      "Split the extract into smaller files, one village at a time."
    );
  }

  switch (extension) {
    case ".csv":
      return parseCsv(buffer.toString("utf-8"));
    case ".xlsx":
      return parseXlsx(buffer);
    case ".docx":
      return parseDocx(buffer);
    case ".pdf":
      return parsePdf(buffer);
    default:
      throw new UnreadableFileError(
        `${fileName} is a ${extension || "file with no extension"}, which is not an accepted format.`,
        `Accepted formats are ${ACCEPTED_EXTENSIONS.join(", ")}. A PDF must carry a text layer, not be a scan.`
      );
  }
}

/* ── XLSX ─────────────────────────────────────────────────────────────── */

async function parseXlsx(buffer: Buffer): Promise<ParseResult> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new UnreadableFileError(
      "The spreadsheet could not be opened.",
      "Re-save it as .xlsx from Excel or LibreOffice, or export it as CSV."
    );
  }

  const sheet = workbook.worksheets.find((w) => w.rowCount > 0);
  if (!sheet) {
    throw new UnreadableFileError(
      "The spreadsheet has no sheet with any rows in it.",
      "Fill in the template and upload it again."
    );
  }

  const grid: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    // `row.values` is 1-based with a leading hole, which is why this walks
    // by column index rather than mapping the array.
    const width = Math.max(sheet.columnCount, row.cellCount);
    for (let c = 1; c <= width; c++) {
      cells.push(cellText(row.getCell(c).value));
    }
    grid.push(cells);
  });

  const sheetNote =
    workbook.worksheets.length > 1
      ? `XLSX (sheet "${sheet.name}" of ${workbook.worksheets.length})`
      : "XLSX";
  return gridToRows(grid, sheetNote);
}

/** Flattens a spreadsheet cell to the text a human would see in it. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    // Kept in the day-month-year form the schemas parse, so a real date cell
    // and a typed date string reach the validator identically.
    const d = String(value.getUTCDate()).padStart(2, "0");
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    return `${d}-${m}-${value.getUTCFullYear()}`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.result === "string" || typeof obj.result === "number") return String(obj.result);
    if (Array.isArray(obj.richText)) {
      return (obj.richText as { text?: string }[]).map((r) => r.text ?? "").join("");
    }
    if (typeof obj.hyperlink === "string" && typeof obj.text === "string") return obj.text;
    return "";
  }
  return String(value);
}

/* ── DOCX ─────────────────────────────────────────────────────────────── */

/**
 * A Word document is read for its tables. A departmental extract circulated
 * as .docx is a table of records inside a memo, so the memo prose is ignored
 * and the first table with a plausible header row is taken.
 */
async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  const mammoth = await import("mammoth");
  let html: string;
  try {
    html = (await mammoth.convertToHtml({ buffer })).value;
  } catch {
    throw new UnreadableFileError(
      "The Word document could not be opened.",
      "Re-save it as .docx, or export the table as CSV."
    );
  }

  const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
  if (tables.length === 0) {
    throw new UnreadableFileError(
      "The Word document has no table in it.",
      "Records must be in a table, one row each. Fill in the template if the extract is not already tabular."
    );
  }

  let best: string[][] = [];
  for (const [, tableBody] of tables) {
    const grid = htmlTableToGrid(tableBody);
    if (grid.length > best.length) best = grid;
  }

  return gridToRows(best, tables.length > 1 ? `DOCX (largest of ${tables.length} tables)` : "DOCX");
}

function htmlTableToGrid(tableHtml: string): string[][] {
  const grid: string[][] = [];
  for (const [, rowHtml] of tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells: string[] = [];
    for (const [, cellHtml] of rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
      cells.push(stripHtml(cellHtml));
    }
    if (cells.length) grid.push(cells);
  }
  return grid;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/* ── PDF ──────────────────────────────────────────────────────────────── */

/**
 * Reads a PDF's text layer and reconstructs its table.
 *
 * pdf.js gives positioned text runs, not rows, so runs are grouped into lines
 * by their y coordinate and then split into columns at the x positions the
 * header row establishes. That is why a header row is required: without one
 * there is nothing to anchor the columns to, and the alternative would be
 * guessing at which number is an extent — exactly the guessing this replaces.
 */
async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      // No network fetches, no worker: this runs inside a request handler and
      // must not reach out for standard fonts or a worker script.
      useWorkerFetch: false,
      useSystemFonts: true,
    }).promise;
  } catch {
    throw new UnreadableFileError(
      "The PDF could not be opened.",
      "Check the file is a PDF and is not password-protected."
    );
  }

  const lines: { y: number; runs: { x: string; text: string }[] }[] = [];
  let totalCharacters = 0;

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageLines = new Map<number, { x: number; text: string }[]>();

    for (const item of content.items) {
      const run = item as { str?: string; transform?: number[] };
      const text = (run.str ?? "").trim();
      if (!text || !run.transform) continue;
      totalCharacters += text.length;
      const x = run.transform[4];
      const y = Math.round(run.transform[5]);
      // Runs within two points of each other are the same visual line; PDF
      // baselines wobble slightly across a row.
      const key = [...pageLines.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      const bucket = pageLines.get(key) ?? [];
      bucket.push({ x, text });
      pageLines.set(key, bucket);
    }

    const ordered = [...pageLines.entries()].sort((a, b) => b[0] - a[0]);
    for (const [y, runs] of ordered) {
      lines.push({
        y,
        runs: runs.sort((a, b) => a.x - b.x).map((r) => ({ x: String(r.x), text: r.text })),
      });
    }
  }

  if (totalCharacters < 20) {
    throw new UnreadableFileError(
      "This PDF has no text layer — it is a scan, a photograph, or an image-only export.",
      "Rule-based extraction reads text, not pictures of text. Export the digital extract from e-Sevai, or fill in the template for this document type."
    );
  }

  const grid = lines
    .map((line) => line.runs.map((r) => r.text))
    .filter((cells) => cells.length > 1);

  if (grid.length < 2) {
    throw new UnreadableFileError(
      "The PDF has text but no table that could be read as rows and columns.",
      "Upload the extract as CSV or XLSX, or fill in the template."
    );
  }

  return gridToRows(grid, `PDF (${doc.numPages} page${doc.numPages === 1 ? "" : "s"}, text layer)`);
}
