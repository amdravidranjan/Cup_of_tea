import { describe, it, expect } from "vitest";
import {
  coerceExtent,
  coerceSurveyNumber,
  coerceAadhaar,
  coerceDate,
  coerceCoordinates,
  coercePhone,
  verhoeffValid,
} from "./coerce";
import { parseCsv, parseCsvGrid } from "./parse-csv";
import { validateParsed, buildErrorReportCsv, describeSummary } from "./validate";
import { buildTemplateCsv, buildTemplateGuide } from "./templates";
import { schemaFor, RECORD_SCHEMAS, shoelaceHectares } from "./schemas";
import type { RecordSchema } from "./types";

const PATTA = schemaFor("PATTA_CHITTA") as RecordSchema;
const FMB = schemaFor("FMB_SKETCH") as RecordSchema;

describe("extents", () => {
  it("reads a bare number as hectares", () => {
    expect(coerceExtent("0.8400")).toEqual({ ok: true, value: 0.84 });
  });

  it("converts acres and cents", () => {
    expect(coerceExtent("2.08 acres")).toMatchObject({ ok: true, value: 0.8417 });
    expect(coerceExtent("37 cents")).toMatchObject({ ok: true, value: 0.1497 });
  });

  it("reads the hectare-are-square metre form a chitta prints", () => {
    expect(coerceExtent("0-84-00")).toEqual({ ok: true, value: 0.84 });
    expect(coerceExtent("1-25-50")).toEqual({ ok: true, value: 1.255 });
  });

  it("rejects an unnamed unit rather than guessing", () => {
    const result = coerceExtent("2.08 bighas");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("bighas");
  });

  it("rejects prose", () => {
    expect(coerceExtent("about two acres").ok).toBe(false);
  });
});

describe("survey numbers", () => {
  it("accepts field numbers and subdivisions", () => {
    expect(coerceSurveyNumber("112")).toEqual({ ok: true, value: "112" });
    expect(coerceSurveyNumber("112/2a")).toEqual({ ok: true, value: "112/2A" });
    expect(coerceSurveyNumber("112/2A1B")).toEqual({ ok: true, value: "112/2A1B" });
  });

  it("rejects anything that does not start with a field number", () => {
    expect(coerceSurveyNumber("A112").ok).toBe(false);
    expect(coerceSurveyNumber("112-2A").ok).toBe(false);
  });
});

describe("aadhaar", () => {
  // Built to satisfy Verhoeff so the test exercises the real check.
  const valid = "234567890124";

  it("agrees with the Verhoeff checksum", () => {
    expect(verhoeffValid(valid)).toBe(true);
  });

  it("masks a full number and never returns it", () => {
    const result = coerceAadhaar(valid);
    expect(result).toEqual({ ok: true, value: "XXXX-XXXX-0124" });
    if (result.ok) expect(result.value).not.toContain("2345");
  });

  it("passes an already-masked number through", () => {
    expect(coerceAadhaar("XXXX-XXXX-4417")).toEqual({ ok: true, value: "XXXX-XXXX-4417" });
  });

  it("catches a transposed digit through the checksum", () => {
    const transposed = "234567890142";
    const result = coerceAadhaar(transposed);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("checksum");
  });

  it("rejects numbers starting 0 or 1", () => {
    expect(coerceAadhaar("034567890124").ok).toBe(false);
  });
});

describe("dates", () => {
  it("reads the Indian day-month-year convention", () => {
    const result = coerceDate("14-03-2026");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.toISOString()).toBe("2026-03-14T00:00:00.000Z");
  });

  it("reads ISO", () => {
    const result = coerceDate("2026-03-14");
    if (result.ok) expect(result.value.toISOString()).toBe("2026-03-14T00:00:00.000Z");
  });

  it("rejects a date that is not on the calendar", () => {
    expect(coerceDate("31-02-2026").ok).toBe(false);
  });
});

describe("coordinates", () => {
  it("reads a semicolon-separated ring", () => {
    const result = coerceCoordinates("76.9012 11.0341; 76.9021 11.0341; 76.9021 11.0332");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(3);
  });

  it("catches swapped longitude and latitude", () => {
    // 11.03 as a longitude is in the Atlantic, off West Africa.
    const result = coerceCoordinates("11.0341 76.9012");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("outside India");
  });
});

describe("phone", () => {
  it("strips the country code and formatting", () => {
    expect(coercePhone("+91 94450-12345")).toEqual({ ok: true, value: "9445012345" });
  });
  it("rejects a landline-length number", () => {
    expect(coercePhone("044 2345 6789").ok).toBe(false);
  });
});

describe("CSV reading", () => {
  it("honours quotes around embedded commas", () => {
    const grid = parseCsvGrid('a,b\n"1,2",3\n');
    expect(grid[1]).toEqual(["1,2", "3"]);
  });

  it("honours escaped quotes", () => {
    const grid = parseCsvGrid('a\n"He said ""yes"""\n');
    expect(grid[1]).toEqual(['He said "yes"']);
  });

  it("strips a byte-order mark from the first heading", () => {
    const parsed = parseCsv("﻿Survey Number,Village\n112/2A,Sirumugai\n");
    expect(parsed.headers[0]).toBe("Survey Number");
  });

  it("numbers rows as the spreadsheet shows them", () => {
    const parsed = parseCsv("A\n1\n2\n");
    expect(parsed.rows.map((r) => r.rowNumber)).toEqual([2, 3]);
  });

  it("refuses a file with headings but no data", () => {
    expect(() => parseCsv("Survey Number,Village\n")).toThrow(/no data rows/);
  });
});

describe("validation against a schema", () => {
  it("accepts a well-formed patta extract", () => {
    const csv = [
      "Patta Number,Survey Number,Holder Name,Village,Extent",
      "1247,112/2A,R. Murugan,Kizhakku Sirumugai,0.8400",
      "1248,112/2B,L. Lakshmi,Kizhakku Sirumugai,2.08 acres",
    ].join("\n");
    const summary = validateParsed(parseCsv(csv), PATTA);

    expect(summary.rows).toHaveLength(2);
    expect(summary.rows.every((r) => r.valid)).toBe(true);
    expect(summary.rows[0].values.surveyNumber).toBe("112/2A");
    expect(summary.rows[1].values.extent).toBeCloseTo(0.8417, 4);
  });

  it("accepts alternate column spellings", () => {
    const csv = ["Patta No,S.No,Owner Name,Revenue Village,Area (Ha)", "1247,112/2A,R. Murugan,Sirumugai,0.84"].join("\n");
    const summary = validateParsed(parseCsv(csv), PATTA);
    expect(summary.missingHeaders).toEqual([]);
    expect(summary.rows[0].valid).toBe(true);
  });

  it("names the row, column, value and remedy for a bad cell", () => {
    const csv = [
      "Patta Number,Survey Number,Holder Name,Village,Extent",
      "1247,112/2A,R. Murugan,Sirumugai,0.84",
      "1248,112/2B,L. Lakshmi,Sirumugai,about two acres",
    ].join("\n");
    const summary = validateParsed(parseCsv(csv), PATTA);

    const bad = summary.rows.find((r) => !r.valid);
    expect(bad?.rowNumber).toBe(3);
    expect(bad?.issues[0]).toMatchObject({ label: "Extent", found: "about two acres" });
    expect(bad?.issues[0].expected).toContain("hectares");
  });

  it("reports a required column that is absent from the file entirely", () => {
    const summary = validateParsed(parseCsv("Patta Number,Village\n1247,Sirumugai\n"), PATTA);
    expect(summary.missingHeaders.map((m) => m.field).sort()).toEqual([
      "extent",
      "holderName",
      "surveyNumber",
    ]);
    expect(describeSummary(summary)).toContain("missing required columns");
  });

  it("keeps unrecognised columns without failing the row", () => {
    const csv = ["Patta Number,Survey Number,Holder Name,Village,Extent,Remarks", "1247,112/2A,R. Murugan,Sirumugai,0.84,Verified"].join("\n");
    const summary = validateParsed(parseCsv(csv), PATTA);
    expect(summary.unknownHeaders).toEqual(["Remarks"]);
    expect(summary.rows[0].valid).toBe(true);
  });

  it("catches an extent that contradicts its own boundary", () => {
    const csv = [
      "Survey Number,Village,Extent,Boundary Coordinates",
      // ~0.84 ha of corners, but 84 ha claimed.
      "112/2A,Sirumugai,84,76.9012 11.0341; 76.9021 11.0341; 76.9021 11.0332; 76.9012 11.0332",
    ].join("\n");
    const summary = validateParsed(parseCsv(csv), FMB);
    expect(summary.rows[0].valid).toBe(false);
    expect(summary.rows[0].issues[0].message).toContain("does not match");
  });

  it("accepts an extent that agrees with its boundary", () => {
    const points: [number, number][] = [
      [76.9012, 11.0341],
      [76.9021, 11.0341],
      [76.9021, 11.0332],
      [76.9012, 11.0332],
    ];
    const area = shoelaceHectares(points);
    const csv = [
      "Survey Number,Village,Extent,Boundary Coordinates",
      `112/2A,Sirumugai,${area.toFixed(4)},${points.map((p) => `${p[0]} ${p[1]}`).join("; ")}`,
    ].join("\n");
    const summary = validateParsed(parseCsv(csv), FMB);
    expect(summary.rows[0].issues).toEqual([]);
  });

  it("produces an error report naming every rejection", () => {
    const csv = [
      "Patta Number,Survey Number,Holder Name,Village,Extent",
      "1247,112/2A,R. Murugan,Sirumugai,0.84",
      "1248,BAD,L. Lakshmi,Sirumugai,two acres",
    ].join("\n");
    const report = buildErrorReportCsv(validateParsed(parseCsv(csv), PATTA));
    expect(report.split("\n")[0]).toBe("Row,Column,Found,Problem,Expected");
    expect(report).toContain("Survey Number");
    expect(report).toContain("two acres");
  });
});

describe("templates", () => {
  it("generates a template every validator accepts", () => {
    // The contract that matters: the example row in the downloaded template
    // must pass the validator that will judge the officer's upload. If these
    // can disagree, the platform is teaching a format it then rejects.
    for (const schema of Object.values(RECORD_SCHEMAS)) {
      const summary = validateParsed(parseCsv(buildTemplateCsv(schema)), schema);
      expect(summary.missingHeaders, `${schema.category} missing headers`).toEqual([]);
      expect(
        summary.rows[0].issues,
        `${schema.category} example row: ${JSON.stringify(summary.rows[0].issues)}`
      ).toEqual([]);
    }
  });

  it("documents every field in the guide", () => {
    const guide = buildTemplateGuide(PATTA);
    for (const field of PATTA.fields) {
      expect(guide).toContain(field.label);
    }
    expect(guide).toContain("text layer");
  });
});
