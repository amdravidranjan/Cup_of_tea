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
    CREATE TABLE rr_stage_history (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, from_stage TEXT, to_stage TEXT NOT NULL,
      action TEXT NOT NULL, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, note TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  await testDb.insert(schema.projects).values({
    id: "p-1",
    name: "Test Bridge",
    purpose: "Testing",
    state: "Odisha",
    district: "Koraput",
    stage: "RR_IN_PROGRESS",
    createdBy: "u-agency-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

describe("R&R data layer", () => {
  it("returns null stage and empty history before the workflow starts", async () => {
    const { getRRStageWith, getRRHistoryWith } = await import("./rr");
    expect(await getRRStageWith(testDb, "p-1")).toBeNull();
    expect(await getRRHistoryWith(testDb, "p-1")).toEqual([]);
  });

  it("applies a transition, updates the project, and records history with a note", async () => {
    const { applyRRTransitionWith, getRRStageWith, getRRHistoryWith } = await import("./rr");
    const stage = await applyRRTransitionWith(
      testDb,
      "p-1",
      "COMPLETE_SURVEY",
      "u-district-1",
      "district",
      "42 families surveyed"
    );
    expect(stage).toBe("SURVEYED");
    expect(await getRRStageWith(testDb, "p-1")).toBe("SURVEYED");
    const history = await getRRHistoryWith(testDb, "p-1");
    expect(history).toHaveLength(1);
    expect(history[0].fromStage).toBeNull();
    expect(history[0].toStage).toBe("SURVEYED");
    expect(history[0].note).toBe("42 families surveyed");
  });

  it("walks multiple steps in order", async () => {
    const { applyRRTransitionWith, getRRHistoryWith } = await import("./rr");
    await applyRRTransitionWith(testDb, "p-1", "COMPLETE_SURVEY", "u-district-1", "district");
    await applyRRTransitionWith(testDb, "p-1", "COMPLETE_SCHEME", "u-district-1", "district");
    const history = await getRRHistoryWith(testDb, "p-1");
    expect(history.map((h) => h.toStage)).toEqual(["SURVEYED", "SCHEME_DRAFTED"]);
    expect(history[1].fromStage).toBe("SURVEYED");
  });

  it("throws for an unknown project id", async () => {
    const { applyRRTransitionWith } = await import("./rr");
    await expect(
      applyRRTransitionWith(testDb, "does-not-exist", "COMPLETE_SURVEY", "u-1", "district")
    ).rejects.toThrow(/not found/i);
  });
});
