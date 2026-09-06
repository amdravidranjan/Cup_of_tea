import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseFile } from "./parse";
import { validateParsed, buildErrorReportCsv } from "./validate";
import { schemaFor } from "./schemas";
import { UnreadableFileError } from "./types";
import { buildParcels, buildHolders } from "@/db/flagship-project";

/**
 * The demo kit and the reader are one thing.
 *
 * Every record file in `demo-kit/flagship/` is generated from
 * `src/db/flagship-project.ts` and read back by this parser. If either side
 * moves without the other, the demo breaks in front of an audience rather
 * than here — which is the whole reason this test exists.
 *
 * Regenerate with `npx tsx scripts/build-flagship-kit.ts`.
 */

const KIT = resolve(process.cwd(), "demo-kit", "flagship");
const kitExists = existsSync(join(KIT, "records"));

const read = (relative: string) => readFileSync(join(KIT, relative));
const nameOf = (relative: string) => relative.split("/").pop()!;

async function parseKitFile(relative: string, category: string) {
  const schema = schemaFor(category);
  expect(schema, `no schema for ${category}`).toBeTruthy();
  const parsed = await parseFile(read(relative), nameOf(relative), "");
  return { parsed, summary: validateParsed(parsed, schema!) };
}

describe.skipIf(!kitExists)("the flagship demo kit round-trips through the real reader", () => {
  it("reads every FMB sheet cleanly, and registers the plots the source defines", async () => {
    const expected = buildParcels();
    let readTotal = 0;

    for (const village of ["kizhakku-sirumugai", "alangombu", "thenkarai-pudur"]) {
      const { parsed, summary } = await parseKitFile(
        `records/fmb-sketch-${village}.csv`,
        "FMB_SKETCH"
      );
      expect(parsed.method).toBe("CSV");
      expect(summary.missingHeaders).toEqual([]);
      const bad = summary.rows.filter((r) => r.issues.length > 0);
      expect(bad.map((r) => r.issues), `${village}: ${buildErrorReportCsv(summary)}`).toEqual([]);
      readTotal += summary.rows.length;
    }

    // Every plot in the source appears in exactly one village sheet.
    expect(readTotal).toBe(expected.length);
  });

  it("reads the chitta spreadsheet, including its three different extent units", async () => {
    const { parsed, summary } = await parseKitFile(
      "records/patta-chitta-extract-mettupalayam.xlsx",
      "PATTA_CHITTA"
    );
    expect(parsed.method).toContain("XLSX");
    expect(summary.missingHeaders).toEqual([]);
    expect(summary.rows.filter((r) => r.issues.length > 0)).toEqual([]);

    const holders = buildHolders(buildParcels());
    expect(summary.rows).toHaveLength(holders.length);

    // The file quotes extents in hectares, in acres, and in the
    // hectare-are-square-metre form. All three must land on the same number
    // the source holds, within the rounding the written form allows.
    for (const row of summary.rows) {
      const holder = holders.find((h) => h.surveyNumber === row.values.surveyNumber);
      expect(holder, `no holder for ${row.values.surveyNumber}`).toBeTruthy();
      expect(row.values.extent as number).toBeCloseTo(holder!.extent, 2);
    }
  });

  it("reads the survey report out of a PDF text layer", async () => {
    const { parsed, summary } = await parseKitFile(
      "records/dgps-survey-report.pdf",
      "GPS_SURVEY_REPORT"
    );
    expect(parsed.method).toContain("PDF");
    expect(parsed.method).toContain("text layer");
    expect(summary.missingHeaders).toEqual([]);
    expect(summary.rows.length).toBeGreaterThan(20);
    expect(summary.rows.filter((r) => r.issues.length > 0)).toEqual([]);
  });

  it.each([
    ["records/encumbrance-certificate.csv", "ENCUMBRANCE_CERTIFICATE"],
    ["records/guideline-value-certificate.csv", "GUIDELINE_VALUE_CERTIFICATE"],
    ["records/asset-valuation-report.csv", "ASSET_VALUATION_REPORT"],
    ["records/legal-heir-certificate.csv", "LEGAL_HEIR_CERTIFICATE"],
  ])("reads %s cleanly", async (file, category) => {
    const { summary } = await parseKitFile(file, category);
    expect(summary.missingHeaders).toEqual([]);
    expect(
      summary.rows.filter((r) => r.issues.length > 0).map((r) => r.issues)
    ).toEqual([]);
  });

  it("rejects the deliberately broken extract row by row, with a reason for each", async () => {
    const { summary } = await parseKitFile("records/patta-chitta-with-errors.csv", "PATTA_CHITTA");
    const failed = summary.rows.filter((r) => r.issues.length > 0);
    expect(failed.length).toBeGreaterThanOrEqual(5);

    const messages = failed.flatMap((r) => r.issues.map((i) => `${i.label}: ${i.message}`));
    // Each of these is a different class of mistake, and each must be named
    // rather than lumped into a generic failure.
    expect(messages.some((m) => m.includes("about two acres"))).toBe(true);
    expect(messages.some((m) => m.includes("112-2A"))).toBe(true);
    expect(messages.some((m) => m.includes("checksum"))).toBe(true);
    expect(messages.some((m) => m.startsWith("Holder Name: Holder Name is required"))).toBe(true);
    expect(messages.some((m) => m.includes("10-digit Indian mobile"))).toBe(true);

    // Every rejection names the row, the value found and what was expected.
    for (const row of failed) {
      for (const issue of row.issues) {
        expect(issue.found.length).toBeGreaterThan(0);
        expect(issue.expected.length).toBeGreaterThan(0);
      }
    }
    expect(buildErrorReportCsv(summary).split("\n")[0]).toBe("Row,Column,Found,Problem,Expected");
  });

  it.each([
    ["rejected-samples/patta-extract.txt", /plain text/i],
    ["rejected-samples/scanned-patta.png", /image/i],
  ])("refuses %s with a stated reason and a remedy", async (file, reasonPattern) => {
    // The old reader would have produced a titleholder from either of these.
    await expect(parseFile(read(file), nameOf(file), "")).rejects.toThrow(UnreadableFileError);

    try {
      await parseFile(read(file), nameOf(file), "");
      throw new Error("should have been rejected");
    } catch (err) {
      expect(err).toBeInstanceOf(UnreadableFileError);
      const rejection = err as UnreadableFileError;
      expect(rejection.message).toMatch(reasonPattern);
      expect(rejection.remedy.length).toBeGreaterThan(20);
    }
  });
});
