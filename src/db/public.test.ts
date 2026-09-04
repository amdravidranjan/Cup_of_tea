import { beforeEach, describe, expect, it } from "vitest";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { createTestDb } from "./test-helpers";

let testDb: LibSQLDatabase<typeof schema>;

const DAY = 24 * 60 * 60 * 1000;
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY);
}

beforeEach(async () => {
  testDb = await createTestDb();

  await testDb.insert(schema.projects).values([
    {
      id: "p-draft",
      name: "Draft Project",
      purpose: "Testing",
      state: "Odisha",
      district: "Koraput",
      stage: "SIA",
      createdBy: "u-agency-1",
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
    },
    {
      id: "p-notified",
      name: "Notified Project",
      purpose: "Testing",
      state: "Tamil Nadu",
      district: "Chennai",
      stage: "NOTIFIED",
      geometryType: "LineString",
      geometryGeoJson: JSON.stringify([[80.2, 13.0], [80.3, 13.1]]),
      createdBy: "u-agency-1",
      createdAt: daysAgo(90),
      updatedAt: daysAgo(90),
    },
    {
      id: "p-awarded",
      name: "Awarded Project",
      purpose: "Testing",
      state: "Tamil Nadu",
      district: "Chennai",
      stage: "AWARDED",
      createdBy: "u-agency-1",
      createdAt: daysAgo(200),
      updatedAt: daysAgo(150),
    },
  ]);

  await testDb.insert(schema.stageHistory).values([
    {
      id: "h-draft-1",
      projectId: "p-draft",
      fromStage: null,
      toStage: "DRAFT",
      action: "CREATE",
      actorId: "u-agency-1",
      actorRole: "agency",
      createdAt: daysAgo(10),
    },
    {
      id: "h-notified-1",
      projectId: "p-notified",
      fromStage: null,
      toStage: "DRAFT",
      action: "CREATE",
      actorId: "u-agency-1",
      actorRole: "agency",
      createdAt: daysAgo(95),
    },
    {
      id: "h-notified-2",
      projectId: "p-notified",
      fromStage: "SIA",
      toStage: "NOTIFIED",
      action: "COMPLETE",
      actorId: "u-district-1",
      actorRole: "district",
      createdAt: daysAgo(90),
    },
    {
      id: "h-awarded-1",
      projectId: "p-awarded",
      fromStage: "SIA",
      toStage: "NOTIFIED",
      action: "COMPLETE",
      actorId: "u-district-1",
      actorRole: "district",
      createdAt: daysAgo(195),
    },
    {
      id: "h-awarded-2",
      projectId: "p-awarded",
      fromStage: "DECLARED",
      toStage: "AWARDED",
      action: "PASS_AWARD",
      actorId: "u-district-1",
      actorRole: "district",
      createdAt: daysAgo(150),
    },
  ]);

  await testDb.insert(schema.parcels).values([
    {
      id: "pc-awarded-1",
      projectId: "p-awarded",
      village: "V1",
      areaHectares: 2.0,
      status: "ACQUIRED",
      geometryGeoJson: "[[[0,0],[0,1],[1,1],[0,0]]]",
      createdAt: daysAgo(200),
    },
  ]);

  await testDb.insert(schema.compensations).values([
    {
      id: "c-awarded-1",
      parcelId: "pc-awarded-1",
      projectId: "p-awarded",
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
      assessedAt: daysAgo(150),
      paidAt: daysAgo(140),
    },
  ]);
});

describe("isPublicStage", () => {
  it("excludes DRAFT/SCRUTINY/SIA and includes NOTIFIED and later", async () => {
    const { isPublicStage } = await import("./public");
    expect(isPublicStage("DRAFT")).toBe(false);
    expect(isPublicStage("SIA")).toBe(false);
    expect(isPublicStage("NOTIFIED")).toBe(true);
    expect(isPublicStage("RR_COMPLETE")).toBe(true);
  });
});

describe("listPublicProjectsWith", () => {
  it("excludes pre-notification projects", async () => {
    const { listPublicProjectsWith } = await import("./public");
    const rows = await listPublicProjectsWith(testDb);
    expect(rows.map((r) => r.id).sort()).toEqual(["p-awarded", "p-notified"]);
  });
});

describe("getPublicProjectDetailWith", () => {
  it("returns null for a pre-notification project (exists but not public)", async () => {
    const { getPublicProjectDetailWith } = await import("./public");
    expect(await getPublicProjectDetailWith(testDb, "p-draft")).toBeNull();
  });

  it("returns null for a nonexistent project", async () => {
    const { getPublicProjectDetailWith } = await import("./public");
    expect(await getPublicProjectDetailWith(testDb, "does-not-exist")).toBeNull();
  });

  it("returns aggregate detail for a public project", async () => {
    const { getPublicProjectDetailWith } = await import("./public");
    const detail = await getPublicProjectDetailWith(testDb, "p-awarded");
    expect(detail).not.toBeNull();
    expect(detail!.project.id).toBe("p-awarded");
    expect(detail!.totalAreaHectares).toBeCloseTo(2.0);
    expect(detail!.villageCount).toBe(1);
    expect(detail!.parcelCount).toBe(1);
    expect(detail!.compensationPaid).toBe(200);
    expect(detail!.compensationTotal).toBe(200);
    expect(detail!.notices.map((n) => n.stage)).toEqual(["NOTIFIED", "AWARDED"]);
  });
});

describe("listPublicNoticesWith", () => {
  it("only includes labeled public-stage transitions, across public projects, newest first", async () => {
    const { listPublicNoticesWith } = await import("./public");
    const notices = await listPublicNoticesWith(testDb);
    expect(notices.map((n) => n.projectId)).toEqual(["p-notified", "p-awarded", "p-awarded"]);
    expect(notices.every((n) => n.label.length > 0)).toBe(true);
  });

  it("respects the limit", async () => {
    const { listPublicNoticesWith } = await import("./public");
    const notices = await listPublicNoticesWith(testDb, 1);
    expect(notices).toHaveLength(1);
  });
});

describe("getPublicPortfolioStatsWith", () => {
  it("excludes the draft project's area and compensation from totals", async () => {
    const { getPublicPortfolioStatsWith } = await import("./public");
    const stats = await getPublicPortfolioStatsWith(testDb);
    expect(stats.projectCount).toBe(2);
    expect(stats.totalAreaHectares).toBeCloseTo(2.0);
    expect(stats.compensationPaid).toBe(200);
  });
});
