import { beforeEach, describe, expect, it } from "vitest";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { createTestDb } from "./test-helpers";

let testDb: LibSQLDatabase<typeof schema>;

beforeEach(async () => {
  testDb = await createTestDb();

  await testDb.insert(schema.projects).values({
    id: "p-1",
    name: "Chennai Metro Phase 2",
    purpose: "Testing",
    state: "Tamil Nadu",
    district: "Chennai",
    stage: "AWARDED",
    createdBy: "u-agency-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await testDb.insert(schema.parcels).values({
    id: "pc-1",
    projectId: "p-1",
    village: "Poonamallee",
    areaHectares: 1.5,
    status: "ACQUIRED",
    geometryGeoJson: "[[[0,0]]]",
    createdAt: new Date(),
  });

  const { createFamilyWith } = await import("./families");
  await createFamilyWith(testDb, {
    projectId: "p-1",
    headOfHouseholdName: "Muthu Selvam",
    village: "Poonamallee",
    category: "landowner",
    memberCount: 4,
    vulnerableGroup: false,
    surveyedBy: "u-district-1",
  });
});

describe("searchWith", () => {
  it("returns nothing for an empty query", async () => {
    const { searchWith } = await import("./search");
    const results = await searchWith(testDb, "");
    expect(results).toEqual({ projects: [], parcels: [], families: [] });
  });

  it("matches a project by name, case-insensitively", async () => {
    const { searchWith } = await import("./search");
    const results = await searchWith(testDb, "chennai metro");
    expect(results.projects).toHaveLength(1);
    expect(results.projects[0].id).toBe("p-1");
  });

  it("matches a parcel by village", async () => {
    const { searchWith } = await import("./search");
    const results = await searchWith(testDb, "poonamallee");
    expect(results.parcels).toHaveLength(1);
    expect(results.parcels[0].projectName).toBe("Chennai Metro Phase 2");
  });

  it("matches a family by head of household name", async () => {
    const { searchWith } = await import("./search");
    const results = await searchWith(testDb, "muthu");
    expect(results.families).toHaveLength(1);
    expect(results.families[0].headOfHouseholdName).toBe("Muthu Selvam");
  });

  it("returns no matches for an unrelated query", async () => {
    const { searchWith } = await import("./search");
    const results = await searchWith(testDb, "zzz-nonexistent");
    expect(results).toEqual({ projects: [], parcels: [], families: [] });
  });
});
