import { beforeEach, describe, expect, it } from "vitest";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { createTestDb } from "./test-helpers";

let testDb: LibSQLDatabase<typeof schema>;

const DAY = 24 * 60 * 60 * 1000;
function daysAgo(n: number): Date {
  // Rounded to the second: integer-timestamp SQLite columns (used
  // throughout this schema) truncate sub-second precision, so a
  // millisecond-precision Date here would never round-trip equal.
  return new Date(Math.floor((Date.now() - n * DAY) / 1000) * 1000);
}

beforeEach(async () => {
  testDb = await createTestDb();

  await testDb.insert(schema.projects).values([
    {
      id: "p-od",
      name: "Odisha Project",
      purpose: "Testing",
      state: "Odisha",
      district: "Koraput",
      stage: "NOTIFIED",
      createdBy: "u-agency-1",
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
    },
    {
      id: "p-tn",
      name: "Tamil Nadu Project",
      purpose: "Testing",
      state: "Tamil Nadu",
      district: "Chennai",
      stage: "AWARDED",
      createdBy: "u-agency-1",
      createdAt: daysAgo(8),
      updatedAt: daysAgo(2),
    },
  ]);

  await testDb.insert(schema.stageHistory).values([
    {
      id: "h-od-1",
      projectId: "p-od",
      fromStage: null,
      toStage: "DRAFT",
      action: "CREATE",
      actorId: "u-agency-1",
      actorRole: "agency",
      createdAt: daysAgo(10),
    },
    {
      id: "h-od-2",
      projectId: "p-od",
      fromStage: "SIA",
      toStage: "NOTIFIED",
      action: "COMPLETE",
      actorId: "u-district-1",
      actorRole: "district",
      createdAt: daysAgo(5),
    },
    {
      id: "h-tn-1",
      projectId: "p-tn",
      fromStage: "DECLARED",
      toStage: "AWARDED",
      action: "PASS_AWARD",
      actorId: "u-district-1",
      actorRole: "district",
      createdAt: daysAgo(2),
    },
  ]);

  await testDb.insert(schema.rrStageHistory).values([
    {
      id: "r-tn-1",
      projectId: "p-tn",
      fromStage: null,
      toStage: "SURVEYED",
      action: "COMPLETE_SURVEY",
      actorId: "u-district-1",
      actorRole: "district",
      note: null,
      createdAt: daysAgo(1),
    },
  ]);
});

describe("listNotificationsWith", () => {
  it("returns all stage and RR events across projects, newest first", async () => {
    const { listNotificationsWith } = await import("./notifications");
    const events = await listNotificationsWith(testDb);
    expect(events).toHaveLength(4);
    expect(events[0].id).toBe("r-tn-1");
    expect(events[0].kind).toBe("rr");
    expect(events[1].id).toBe("h-tn-1");
    expect(events[1].kind).toBe("stage");
    expect(events.map((e) => e.id)).toEqual(["r-tn-1", "h-tn-1", "h-od-2", "h-od-1"]);
  });

  it("filters to one state when given", async () => {
    const { listNotificationsWith } = await import("./notifications");
    const events = await listNotificationsWith(testDb, { state: "Odisha" });
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.state === "Odisha")).toBe(true);
  });

  it("respects the limit", async () => {
    const { listNotificationsWith } = await import("./notifications");
    const events = await listNotificationsWith(testDb, undefined, 2);
    expect(events).toHaveLength(2);
  });
});

describe("last-seen tracking", () => {
  it("returns null when a user has never marked notifications seen", async () => {
    const { getLastSeenWith } = await import("./notifications");
    expect(await getLastSeenWith(testDb, "u-district-1")).toBeNull();
  });

  it("records and returns the last-seen timestamp, upserting on repeat calls", async () => {
    const { getLastSeenWith, markSeenWith } = await import("./notifications");
    const first = daysAgo(3);
    await markSeenWith(testDb, "u-district-1", first);
    expect(await getLastSeenWith(testDb, "u-district-1")).toEqual(first);

    const second = daysAgo(1);
    await markSeenWith(testDb, "u-district-1", second);
    expect(await getLastSeenWith(testDb, "u-district-1")).toEqual(second);
  });
});
