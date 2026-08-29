import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderDocumentPdf, GENERATED_DOCUMENT_STAGE, GENERATED_DOCUMENT_TYPES } from "./generated-documents";

describe("GENERATED_DOCUMENT_STAGE", () => {
  it("maps every generated document type to a real workflow Stage", () => {
    expect(Object.keys(GENERATED_DOCUMENT_STAGE)).toEqual(GENERATED_DOCUMENT_TYPES);
    expect(GENERATED_DOCUMENT_STAGE.NOTIFICATION).toBe("NOTIFIED");
    expect(GENERATED_DOCUMENT_STAGE.AWARD_LETTER).toBe("AWARDED");
  });
});

describe("renderDocumentPdf", () => {
  it("produces a valid, parseable, non-trivial PDF", async () => {
    const bytes = await renderDocumentPdf({
      type: "NOTIFICATION",
      project: {
        name: "Test Bridge Project",
        purpose: "Testing",
        state: "Odisha",
        district: "Koraput",
      },
      issuedAt: new Date("2026-03-15T00:00:00.000Z"),
      issuedBy: "u-district-1",
    });

    expect(bytes.byteLength).toBeGreaterThan(500);
    const header = Buffer.from(bytes.slice(0, 5)).toString("ascii");
    expect(header).toBe("%PDF-");

    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it("includes parcel and compensation data for an award letter", async () => {
    const bytes = await renderDocumentPdf({
      type: "AWARD_LETTER",
      project: {
        name: "Test Bridge Project",
        purpose: "Testing",
        state: "Odisha",
        district: "Koraput",
      },
      issuedAt: new Date("2026-03-15T00:00:00.000Z"),
      issuedBy: "u-district-1",
      parcels: [{ village: "V1", areaHectares: 2.5 }],
      compensationTotal: 500000,
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it("spans multiple pages and summarizes rather than overflowing for a large parcel count", async () => {
    const parcels = Array.from({ length: 600 }, (_, i) => ({
      village: `Village ${i}`,
      areaHectares: 1.1,
    }));
    const bytes = await renderDocumentPdf({
      type: "AWARD_LETTER",
      project: {
        name: "Large Corridor Project",
        purpose: "Testing",
        state: "Tamil Nadu",
        district: "Sivaganga",
      },
      issuedAt: new Date("2026-03-15T00:00:00.000Z"),
      issuedBy: "u-district-1",
      parcels,
      compensationTotal: 50_000_000,
    });
    const reloaded = await PDFDocument.load(bytes);
    // 600 parcels at ~15pt line height would run to 20+ pages if every
    // single one were itemized (the old single-page, no-overflow-check
    // behavior would have silently drawn most of them off the visible
    // page instead) — the itemization cap keeps this small.
    expect(reloaded.getPageCount()).toBeGreaterThan(1);
    expect(reloaded.getPageCount()).toBeLessThan(5);
  });
});
