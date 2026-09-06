import { describe, it, expect } from "vitest";
import { createTestDb } from "./test-helpers";
import { createParcelWith, listParcelsWith, setParcelPattaNumberWith } from "./parcels";
import { createFamilyWith, listFamiliesForProjectWith } from "./families";
import { listIngestedDocumentIdsWith } from "./documents";
import type { PolygonGeometry } from "@/lib/geo";

const geometry: PolygonGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [78.0, 9.9],
      [78.001, 9.9],
      [78.001, 9.901],
      [78.0, 9.901],
      [78.0, 9.9],
    ],
  ],
};

describe("parcels registered from a document", () => {
  it("keeps the provenance of the boundary", async () => {
    const db = await createTestDb();
    await createParcelWith(db, {
      projectId: "p1",
      village: "Melur",
      areaHectares: 1.2,
      status: "NOTIFIED",
      geometry,
      surveyNumber: "142/3B",
      boundaryMethod: "DGPS_SURVEY",
      sourceDocumentId: "doc-1",
      landClassification: "NANJAI",
    });

    const [parcel] = await listParcelsWith(db, "p1");
    expect(parcel.boundaryMethod).toBe("DGPS_SURVEY");
    expect(parcel.sourceDocumentId).toBe("doc-1");
    expect(parcel.landClassification).toBe("NANJAI");
  });

  it("leaves provenance empty for a parcel drawn by hand", async () => {
    const db = await createTestDb();
    await createParcelWith(db, {
      projectId: "p1",
      village: "Melur",
      areaHectares: 1.2,
      status: "NOTIFIED",
      geometry,
    });

    const [parcel] = await listParcelsWith(db, "p1");
    expect(parcel.boundaryMethod).toBeNull();
    expect(parcel.sourceDocumentId).toBeNull();
  });

  it("attaches the patta number once the record of rights is read", async () => {
    const db = await createTestDb();
    const parcelId = await createParcelWith(db, {
      projectId: "p1",
      village: "Melur",
      areaHectares: 1.2,
      status: "NOTIFIED",
      geometry,
      surveyNumber: "142/3B",
    });

    await setParcelPattaNumberWith(db, parcelId, "MAD-PTA-40021");

    const [parcel] = await listParcelsWith(db, "p1");
    expect(parcel.pattaNumber).toBe("MAD-PTA-40021");
  });
});

describe("how a family entered the record", () => {
  it("defaults to the survey, because that is how a person finds one", async () => {
    const db = await createTestDb();
    await createFamilyWith(db, {
      projectId: "p1",
      headOfHouseholdName: "R. Murugan",
      village: "Melur",
      category: "tenant",
      memberCount: 4,
      vulnerableGroup: false,
      surveyedBy: "u1",
    });

    const [family] = await listFamiliesForProjectWith(db, "p1");
    expect(family.source).toBe("SIA_SURVEY");
    expect(family.sourceDocumentId).toBeNull();
  });

  it("records a titleholder read off a land record with their basis", async () => {
    const db = await createTestDb();
    await createFamilyWith(db, {
      projectId: "p1",
      headOfHouseholdName: "K. Lakshmi",
      village: "Melur",
      category: "landowner",
      memberCount: 5,
      vulnerableGroup: false,
      surveyedBy: "u1",
      source: "LAND_RECORD",
      sourceDocumentId: "doc-2",
      entitlementBasis: "S3C_I_LANDOWNER",
      aadhaarMasked: "XXXX XXXX 4821",
      rationCardNumber: "TN42123456",
    });

    const [family] = await listFamiliesForProjectWith(db, "p1");
    expect(family.source).toBe("LAND_RECORD");
    expect(family.entitlementBasis).toBe("S3C_I_LANDOWNER");
    expect(family.aadhaarMasked).toBe("XXXX XXXX 4821");
  });

  // A tenant is an affected family under s.3(c)(ii) without appearing on any
  // patta. The record has to be able to hold that.
  it("records a non-titleholder found by the survey", async () => {
    const db = await createTestDb();
    await createFamilyWith(db, {
      projectId: "p1",
      headOfHouseholdName: "S. Ponnammal",
      village: "Melur",
      category: "livelihood-loser",
      memberCount: 3,
      vulnerableGroup: true,
      surveyedBy: "u1",
      entitlementBasis: "S3C_II_LIVELIHOOD",
    });

    const [family] = await listFamiliesForProjectWith(db, "p1");
    expect(family.source).toBe("SIA_SURVEY");
    expect(family.entitlementBasis).toBe("S3C_II_LIVELIHOOD");
  });
});

describe("documents already read into the register", () => {
  it("reports documents that produced either a parcel or a family", async () => {
    const db = await createTestDb();
    await createParcelWith(db, {
      projectId: "p1",
      village: "Melur",
      areaHectares: 1,
      status: "NOTIFIED",
      geometry,
      sourceDocumentId: "fmb-doc",
    });
    await createFamilyWith(db, {
      projectId: "p1",
      headOfHouseholdName: "K. Lakshmi",
      village: "Melur",
      category: "landowner",
      memberCount: 2,
      vulnerableGroup: false,
      surveyedBy: "u1",
      source: "LAND_RECORD",
      sourceDocumentId: "patta-doc",
    });

    const ingested = await listIngestedDocumentIdsWith(db, "p1");
    expect(ingested).toEqual(new Set(["fmb-doc", "patta-doc"]));
  });

  it("does not leak provenance across projects", async () => {
    const db = await createTestDb();
    await createParcelWith(db, {
      projectId: "p2",
      village: "Melur",
      areaHectares: 1,
      status: "NOTIFIED",
      geometry,
      sourceDocumentId: "other-doc",
    });

    expect(await listIngestedDocumentIdsWith(db, "p1")).toEqual(new Set());
  });
});
