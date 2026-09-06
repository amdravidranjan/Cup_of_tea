import { describe, it, expect } from "vitest";
import { extractDocumentFields, type ExtractionInput } from "./document-intelligence";
import { polygonAreaHectares } from "@/lib/geo";

function input(overrides: Partial<ExtractionInput> = {}): ExtractionInput {
  return {
    documentId: "doc-1",
    fileName: "fmb-142-3b.pdf",
    category: "FMB_SKETCH",
    mimeType: "application/pdf",
    sizeBytes: 24000,
    projectName: "Madurai Ring Road",
    projectPurpose: "Highway",
    state: "Tamil Nadu",
    district: "Madurai",
    ...overrides,
  };
}

describe("cadastral documents yield a parcel", () => {
  it("reads a boundary out of an FMB sketch", () => {
    const parcel = extractDocumentFields(input()).parcel;
    expect(parcel).toBeDefined();
    expect(parcel!.geometry.type).toBe("Polygon");
    expect(parcel!.boundaryMethod).toBe("FMB_SKETCH");
    expect(parcel!.adjoiningSurveyNumbers.length).toBeGreaterThan(0);
  });

  it("marks a DGPS report as the stronger boundary source", () => {
    const parcel = extractDocumentFields(input({ category: "GPS_SURVEY_REPORT" })).parcel;
    expect(parcel!.boundaryMethod).toBe("DGPS_SURVEY");
  });

  it("closes the boundary ring", () => {
    const ring = extractDocumentFields(input()).parcel!.geometry.coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring.length).toBeGreaterThanOrEqual(5); // 4+ corners plus the close
  });

  // The extent is printed next to the sketch. If the two disagree, an officer
  // checking the screen against the paper record is being shown a lie.
  it("reports an extent that matches the boundary actually drawn", () => {
    for (const documentId of ["a", "b", "c", "d", "e"]) {
      const parcel = extractDocumentFields(input({ documentId })).parcel!;
      const ring = parcel.geometry.coordinates[0].slice(0, -1);
      expect(polygonAreaHectares(ring)).toBeCloseTo(parcel.areaHectares, 4);
    }
  });

  it("places the plot near the project alignment when one is drawn", () => {
    const alignment = {
      type: "LineString" as const,
      coordinates: [
        [78.0, 9.9],
        [78.02, 9.92],
      ] as [number, number][],
    };
    const parcel = extractDocumentFields(input({ alignment })).parcel!;
    const [lng, lat] = parcel.geometry.coordinates[0][0];
    expect(Math.abs(lng - 78.01)).toBeLessThan(0.05);
    expect(Math.abs(lat - 9.91)).toBeLessThan(0.05);
  });

  it("falls back to the district when the project has no alignment yet", () => {
    // A project created from scratch has no geometry — the parcel still has
    // to land in the right district rather than at (0, 0).
    const parcel = extractDocumentFields(input({ district: "Coimbatore" })).parcel!;
    const [lng, lat] = parcel.geometry.coordinates[0][0];
    expect(Math.abs(lng - 76.9558)).toBeLessThan(0.05);
    expect(Math.abs(lat - 11.0168)).toBeLessThan(0.05);
  });
});

describe("extraction is deterministic", () => {
  // The server re-runs extraction on ingest instead of trusting the geometry
  // the browser posted. That is only safe if the same document reproduces
  // exactly the same record.
  it("reproduces the identical parcel for the same document id", () => {
    const a = extractDocumentFields(input()).parcel!;
    const b = extractDocumentFields(input()).parcel!;
    expect(b).toEqual(a);
  });

  it("produces a different plot for a different document", () => {
    const a = extractDocumentFields(input({ documentId: "doc-1" })).parcel!;
    const b = extractDocumentFields(input({ documentId: "doc-2" })).parcel!;
    expect(b.geometry).not.toEqual(a.geometry);
  });
});

describe("a patta extract yields the titleholder, not a boundary", () => {
  const pattaInput = input({ category: "PATTA_CHITTA", documentId: "patta-1" });

  it("reads a household but no parcel", () => {
    const extraction = extractDocumentFields(pattaInput);
    expect(extraction.family).toBeDefined();
    expect(extraction.parcel).toBeUndefined();
  });

  it("records the titleholder limb of s.3(c) and nothing wider", () => {
    expect(extractDocumentFields(pattaInput).family!.entitlementBasis).toBe("S3C_I_LANDOWNER");
  });

  it("never exposes a full Aadhaar number", () => {
    const family = extractDocumentFields(pattaInput).family!;
    expect(family.aadhaarMasked).toMatch(/^XXXX XXXX \d{4}$/);
  });

  // Reading a patta for a project that already holds the plot should name
  // that plot, so the owner can be attached to it rather than left floating.
  it("names a survey number the project already holds", () => {
    const family = extractDocumentFields({
      ...pattaInput,
      knownSurveyNumbers: ["142/3B", "143/1"],
      knownVillages: ["Melur"],
    }).family!;
    expect(["142/3B", "143/1"]).toContain(family.surveyNumber);
    expect(family.village).toBe("Melur");
  });

  it("warns that the land record is not the list of affected families", () => {
    const advisories = extractDocumentFields(pattaInput).advisories ?? [];
    expect(advisories.join(" ")).toContain("s.3(c)(ii)");
  });
});

describe("documents that only inform the officer", () => {
  it("produces no registerable record for a DPR", () => {
    const extraction = extractDocumentFields(input({ category: "DPR" }));
    expect(extraction.parcel).toBeUndefined();
    expect(extraction.family).toBeUndefined();
    expect(extraction.fields.length).toBeGreaterThan(0);
  });

  it("flags an asset valuation against the section that requires it", () => {
    const extraction = extractDocumentFields(input({ category: "ASSET_VALUATION_REPORT" }));
    expect(extraction.advisories?.join(" ")).toContain("s.29");
  });

  it("keeps confidence within a sane range", () => {
    const extraction = extractDocumentFields(input({ category: "ENCUMBRANCE_CERTIFICATE" }));
    expect(extraction.overallConfidence).toBeGreaterThan(0.5);
    expect(extraction.overallConfidence).toBeLessThanOrEqual(1);
  });
});
