import { beforeEach, describe, expect, it } from "vitest";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

let testDb: LibSQLDatabase<typeof schema>;

const DAY = 24 * 60 * 60 * 1000;
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY);
}

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
    CREATE TABLE stage_history (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, from_stage TEXT, to_stage TEXT NOT NULL,
      action TEXT NOT NULL, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);
  await testDb.run(sql`
    CREATE TABLE rr_stage_history (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, from_stage TEXT, to_stage TEXT NOT NULL,
      action TEXT NOT NULL, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, note TEXT,
      created_at INTEGER NOT NULL
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
    CREATE TABLE compensations (
      id TEXT PRIMARY KEY, parcel_id TEXT NOT NULL, project_id TEXT NOT NULL,
      rate_per_hectare REAL NOT NULL, multiplier REAL NOT NULL, assets_value REAL NOT NULL,
      market_value REAL NOT NULL, multiplied_market_value REAL NOT NULL, solatium REAL NOT NULL,
      interest REAL NOT NULL, total REAL NOT NULL, status TEXT NOT NULL,
      assessed_by TEXT NOT NULL, assessed_at INTEGER NOT NULL, paid_at INTEGER
    );
  `);
  await testDb.run(sql`
    CREATE TABLE infrastructure_items (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, item TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', completed_by TEXT, completed_at INTEGER
    );
  `);

  await testDb.insert(schema.projects).values([
    {
      id: "p-1",
      name: "Odisha Project",
      purpose: "Testing",
      state: "Odisha",
      district: "Koraput",
      stage: "AWARDED",
      createdBy: "u-agency-1",
      createdAt: daysAgo(10),
      updatedAt: daysAgo(2),
    },
    {
      id: "p-2",
      name: "Tamil Nadu Project",
      purpose: "Testing",
      state: "Tamil Nadu",
      district: "Chennai",
      stage: "DRAFT",
      createdBy: "u-agency-1",
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
  ]);

  await testDb.insert(schema.parcels).values({
    id: "pc-1",
    projectId: "p-1",
    village: "V1",
    areaHectares: 2.5,
    status: "ACQUIRED",
    geometryGeoJson: "[[[0,0]]]",
    createdAt: daysAgo(10),
  });

  await testDb.insert(schema.compensations).values({
    id: "c-1",
    parcelId: "pc-1",
    projectId: "p-1",
    ratePerHectare: 100,
    multiplier: 1,
    assetsValue: 0,
    marketValue: 100,
    multipliedMarketValue: 100,
    solatium: 100,
    interest: 0,
    total: 200,
    status: "PAID",
    assessedBy: "u-district-1",
    assessedAt: daysAgo(3),
    paidAt: daysAgo(2),
  });
});

describe("getProjectReportRowsWith", () => {
  it("includes every project regardless of stage, with area/compensation/SLA columns", async () => {
    const { getProjectReportRowsWith } = await import("./reports");
    const rows = await getProjectReportRowsWith(testDb);
    expect(rows).toHaveLength(2);

    const p1 = rows.find((r) => r.id === "p-1")!;
    expect(p1.totalAreaHectares).toBeCloseTo(2.5);
    expect(p1.parcelCount).toBe(1);
    expect(p1.compensationPaid).toBe(200);
    expect(p1.compensationTotal).toBe(200);
    expect(p1.slaDeclaration).toBeDefined();

    const p2 = rows.find((r) => r.id === "p-2")!;
    expect(p2.stage).toBe("DRAFT");
    expect(p2.totalAreaHectares).toBe(0);
    expect(p2.slaDeclaration).toBe("not-applicable");
  });

  it("filters by state", async () => {
    const { getProjectReportRowsWith } = await import("./reports");
    const rows = await getProjectReportRowsWith(testDb, { state: "Odisha" });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("p-1");
  });
});
