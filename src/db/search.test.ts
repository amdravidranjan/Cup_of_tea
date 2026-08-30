import { beforeEach, describe, expect, it } from "vitest";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

let testDb: LibSQLDatabase<typeof schema>;

beforeEach(async () => {
  const client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await testDb.run(sql`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, purpose TEXT NOT NULL,
      state TEXT NOT NULL, district TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'DRAFT',
      created_by TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      geometry_type TEXT, geometry_geo_json TEXT, rr_stage TEXT
    );
  `);
  await testDb.run(sql`
    CREATE TABLE parcels (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, village TEXT NOT NULL,
      area_hectares REAL NOT NULL, status TEXT NOT NULL, geometry_geo_json TEXT NOT NULL,
      created_at INTEGER NOT NULL, survey_number TEXT, patta_number TEXT
    );
  `);
  await testDb.run(sql`
    CREATE TABLE families (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, parcel_id TEXT,
      head_of_household_name TEXT NOT NULL, village TEXT NOT NULL, category TEXT NOT NULL,
      member_count INTEGER NOT NULL, vulnerable_group INTEGER NOT NULL DEFAULT 0,
      contact_phone TEXT, surveyed_by TEXT NOT NULL, surveyed_at INTEGER NOT NULL
    );
  `);
  await testDb.run(sql`
    CREATE TABLE entitlements (
      id TEXT PRIMARY KEY, family_id TEXT NOT NULL, type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', amount REAL, granted_by TEXT,
      granted_at INTEGER, note TEXT
    );
  `);

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
