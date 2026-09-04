import { beforeEach, describe, expect, it } from "vitest";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { createTestDb } from "./test-helpers";

// Typed explicitly rather than `ReturnType<typeof drizzle>` — that resolves
// against the generic function's default type parameters, not this file's
// actual `drizzle(client, { schema })` call, and silently loses the real
// schema type (surfaces only under `tsc --noEmit`, not the dev server).
let testDb: LibSQLDatabase<typeof schema>;

beforeEach(async () => {
  testDb = await createTestDb();
});

describe("projects data layer", () => {
  it("creates a project in DRAFT and writes an initial history row", async () => {
    const { createProjectWith, listProjectsWith } = await import("./projects");
    const id = await createProjectWith(testDb, {
      name: "Test Bridge",
      purpose: "Testing",
      state: "Odisha",
      district: "Koraput",
      createdBy: "u-agency-1",
      createdByRole: "agency",
    });
    const all = await listProjectsWith(testDb);
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(id);
    expect(all[0].stage).toBe("DRAFT");
  });

  it("applies a valid transition and records history", async () => {
    const { createProjectWith, applyProjectTransitionWith, getProjectWith } =
      await import("./projects");
    const id = await createProjectWith(testDb, {
      name: "Test Bridge",
      purpose: "Testing",
      state: "Odisha",
      district: "Koraput",
      createdBy: "u-agency-1",
      createdByRole: "agency",
    });
    const nextStage = await applyProjectTransitionWith(
      testDb,
      id,
      "SUBMIT",
      "u-agency-1",
      "agency"
    );
    expect(nextStage).toBe("SCRUTINY");
    const project = await getProjectWith(testDb, id);
    expect(project?.stage).toBe("SCRUTINY");
  });

  it("throws for an unknown project id", async () => {
    const { applyProjectTransitionWith } = await import("./projects");
    await expect(
      applyProjectTransitionWith(testDb, "does-not-exist", "SUBMIT", "u-1", "agency")
    ).rejects.toThrow(/not found/i);
  });

  it("propagates the workflow error for an invalid transition", async () => {
    const { createProjectWith, applyProjectTransitionWith } = await import(
      "./projects"
    );
    const id = await createProjectWith(testDb, {
      name: "Test Bridge",
      purpose: "Testing",
      state: "Odisha",
      district: "Koraput",
      createdBy: "u-agency-1",
      createdByRole: "agency",
    });
    await expect(
      applyProjectTransitionWith(testDb, id, "PASS_AWARD", "u-1", "district")
    ).rejects.toThrow(/no transition/i);
  });

  it("returns stage history in chronological order", async () => {
    const { createProjectWith, applyProjectTransitionWith, getStageHistoryWith } =
      await import("./projects");
    const id = await createProjectWith(testDb, {
      name: "Test Bridge",
      purpose: "Testing",
      state: "Odisha",
      district: "Koraput",
      createdBy: "u-agency-1",
      createdByRole: "agency",
    });
    await applyProjectTransitionWith(testDb, id, "SUBMIT", "u-agency-1", "agency");
    await applyProjectTransitionWith(testDb, id, "APPROVE", "u-district-1", "district");

    const history = await getStageHistoryWith(testDb, id);
    expect(history).toHaveLength(3);
    expect(history.map((h) => h.action)).toEqual(["CREATE", "SUBMIT", "APPROVE"]);
    expect(history[0].fromStage).toBeNull();
    expect(history[1].fromStage).toBe("DRAFT");
    expect(history[2].toStage).toBe("SIA");
  });

  it("stores and retrieves project geometry", async () => {
    const { createProjectWith, setProjectGeometryWith, getProjectWith } = await import(
      "./projects"
    );
    const id = await createProjectWith(testDb, {
      name: "Test Bridge",
      purpose: "Testing",
      state: "Odisha",
      district: "Koraput",
      createdBy: "u-agency-1",
      createdByRole: "agency",
    });
    await setProjectGeometryWith(testDb, id, {
      type: "LineString",
      coordinates: [
        [82.71, 18.81],
        [82.712, 18.815],
      ],
    });
    const project = await getProjectWith(testDb, id);
    expect(project?.geometryType).toBe("LineString");
    expect(JSON.parse(project!.geometryGeoJson!)).toEqual([
      [82.71, 18.81],
      [82.712, 18.815],
    ]);
  });

  it("rejects COMPLETE_RR until the R&R sub-workflow reaches RR_AWARDED, then allows it", async () => {
    const { createProjectWith, applyProjectTransitionWith } = await import("./projects");
    const id = await createProjectWith(testDb, {
      name: "Test Bridge",
      purpose: "Testing",
      state: "Odisha",
      district: "Koraput",
      createdBy: "u-agency-1",
      createdByRole: "agency",
    });
    await applyProjectTransitionWith(testDb, id, "SUBMIT", "u-agency-1", "agency");
    await applyProjectTransitionWith(testDb, id, "APPROVE", "u-district-1", "district");
    await applyProjectTransitionWith(testDb, id, "COMPLETE", "u-district-1", "district");
    await applyProjectTransitionWith(testDb, id, "STATE_APPROVE", "u-state-1", "state");
    await applyProjectTransitionWith(testDb, id, "CENTRAL_APPROVE", "u-central-1", "central");
    await applyProjectTransitionWith(
      testDb,
      id,
      "PUBLISH_DECLARATION",
      "u-district-1",
      "district"
    );
    await applyProjectTransitionWith(testDb, id, "PASS_AWARD", "u-district-1", "district");
    await applyProjectTransitionWith(testDb, id, "START_RR", "u-district-1", "district");

    await expect(
      applyProjectTransitionWith(testDb, id, "COMPLETE_RR", "u-district-1", "district")
    ).rejects.toThrow(/r&r award workflow is not complete/i);

    await testDb
      .update(schema.projects)
      .set({ rrStage: "RR_AWARDED" })
      .where(eq(schema.projects.id, id));

    const finalStage = await applyProjectTransitionWith(
      testDb,
      id,
      "COMPLETE_RR",
      "u-district-1",
      "district"
    );
    expect(finalStage).toBe("POSSESSION");
  });
});
