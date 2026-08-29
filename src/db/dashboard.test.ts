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
      created_at INTEGER NOT NULL
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
      id: "p-a",
      name: "Project A",
      purpose: "Testing",
      state: "Odisha",
      district: "Koraput",
      stage: "AWARDED",
      createdBy: "u-agency-1",
      createdAt: daysAgo(300),
      updatedAt: daysAgo(280),
    },
    {
      id: "p-b",
      name: "Project B",
      purpose: "Testing",
      state: "Tamil Nadu",
      district: "Chennai",
      stage: "NOTIFIED",
      createdBy: "u-agency-1",
      createdAt: daysAgo(90),
      updatedAt: daysAgo(90),
    },
  ]);

  await testDb.insert(schema.stageHistory).values([
    {
      id: "h-a1",
      projectId: "p-a",
      fromStage: null,
      toStage: "DRAFT",
      action: "CREATE",
      actorId: "u-agency-1",
      actorRole: "agency",
      createdAt: daysAgo(300),
    },
    {
      id: "h-a2",
      projectId: "p-a",
      fromStage: "SIA",
      toStage: "NOTIFIED",
      action: "COMPLETE",
      actorId: "u-district-1",
      actorRole: "district",
      createdAt: daysAgo(295),
    },
    {
      id: "h-a3",
      projectId: "p-a",
      fromStage: "CENTRAL_APPROVED",
      toStage: "DECLARED",
      action: "PUBLISH_DECLARATION",
      actorId: "u-district-1",
      actorRole: "district",
      createdAt: daysAgo(290),
    },
    {
      id: "h-a4",
      projectId: "p-a",
      fromStage: "DECLARED",
      toStage: "AWARDED",
      action: "PASS_AWARD",
      actorId: "u-district-1",
      actorRole: "district",
      createdAt: daysAgo(280),
    },
    {
      id: "h-b1",
      projectId: "p-b",
      fromStage: null,
      toStage: "DRAFT",
      action: "CREATE",
      actorId: "u-agency-1",
      actorRole: "agency",
      createdAt: daysAgo(90),
    },
    {
      id: "h-b2",
      projectId: "p-b",
      fromStage: "SIA",
      toStage: "NOTIFIED",
      action: "COMPLETE",
      actorId: "u-district-1",
      actorRole: "district",
      createdAt: daysAgo(90),
    },
  ]);

  await testDb.insert(schema.parcels).values([
    {
      id: "pc-a1",
      projectId: "p-a",
      village: "V1",
      areaHectares: 1.0,
      status: "ACQUIRED",
      geometryGeoJson: "[[[0,0]]]",
      createdAt: daysAgo(300),
    },
    {
      id: "pc-a2",
      projectId: "p-a",
      village: "V2",
      areaHectares: 2.0,
      status: "ACQUIRED",
      geometryGeoJson: "[[[0,0]]]",
      createdAt: daysAgo(300),
    },
    {
      id: "pc-b1",
      projectId: "p-b",
      village: "V3",
      areaHectares: 1.5,
      status: "NOTIFIED",
      geometryGeoJson: "[[[0,0]]]",
      createdAt: daysAgo(90),
    },
  ]);

  await testDb.insert(schema.compensations).values([
    {
      id: "c-a1",
      parcelId: "pc-a1",
      projectId: "p-a",
      ratePerHectare: 100,
      multiplier: 1,
      assetsValue: 0,
      marketValue: 100,
      multipliedMarketValue: 100,
      solatium: 100,
      interest: 0,
      total: 100,
      status: "PAID",
      assessedBy: "u-district-1",
      assessedAt: daysAgo(275),
      paidAt: daysAgo(270),
    },
    {
      id: "c-a2",
      parcelId: "pc-a2",
      projectId: "p-a",
      ratePerHectare: 50,
      multiplier: 1,
      assetsValue: 0,
      marketValue: 50,
      multipliedMarketValue: 50,
      solatium: 50,
      interest: 0,
      total: 50,
      status: "ASSESSED",
      assessedBy: "u-district-1",
      assessedAt: daysAgo(275),
      paidAt: null,
    },
  ]);
});

describe("dashboard aggregation", () => {
  it("computes per-project SLA summaries", async () => {
    const { getProjectsWithSLAWith } = await import("./dashboard");
    const summaries = await getProjectsWithSLAWith(testDb);
    expect(summaries).toHaveLength(2);
    const projectA = summaries.find((s) => s.project.id === "p-a")!;
    expect(projectA.metrics.find((m) => m.id === "declaration")!.status).toBe("on-track");
    expect(projectA.metrics.find((m) => m.id === "compensation")!.status).toBe("breached");
  });

  it("filters project summaries by state", async () => {
    const { getProjectsWithSLAWith } = await import("./dashboard");
    const summaries = await getProjectsWithSLAWith(testDb, { state: "Tamil Nadu" });
    expect(summaries).toHaveLength(1);
    expect(summaries[0].project.id).toBe("p-b");
  });

  it("aggregates portfolio stats across all projects", async () => {
    const { getPortfolioStatsWith } = await import("./dashboard");
    const stats = await getPortfolioStatsWith(testDb);
    expect(stats.projectCount).toBe(2);
    expect(stats.stageCounts.AWARDED).toBe(1);
    expect(stats.stageCounts.NOTIFIED).toBe(1);
    expect(stats.totalAreaHectares).toBeCloseTo(4.5);
    expect(stats.compensationPaid).toBe(100);
    expect(stats.compensationTotal).toBe(150);
    expect(stats.slaCounts.breached).toBeGreaterThanOrEqual(1);
  });

  it("scopes portfolio stats to one state", async () => {
    const { getPortfolioStatsWith } = await import("./dashboard");
    const stats = await getPortfolioStatsWith(testDb, { state: "Odisha" });
    expect(stats.projectCount).toBe(1);
    expect(stats.totalAreaHectares).toBeCloseTo(3.0);
  });

  it("breaks down stats by state", async () => {
    const { getStateBreakdownWith } = await import("./dashboard");
    const rows = await getStateBreakdownWith(testDb);
    expect(rows.map((r) => r.state)).toEqual(["Odisha", "Tamil Nadu"]);
    const odisha = rows.find((r) => r.state === "Odisha")!;
    expect(odisha.projectCount).toBe(1);
    expect(odisha.compensationPaid).toBe(100);
  });
});
