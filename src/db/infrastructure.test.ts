import { beforeEach, describe, expect, it } from "vitest";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { createTestDb } from "./test-helpers";

let testDb: LibSQLDatabase<typeof schema>;

beforeEach(async () => {
  testDb = await createTestDb();
});

describe("ensureInfrastructureChecklistWith", () => {
  it("creates all 18 Third Schedule items as PENDING on first call", async () => {
    const { ensureInfrastructureChecklistWith, listInfrastructureChecklistWith } = await import(
      "./infrastructure"
    );
    await ensureInfrastructureChecklistWith(testDb, "p-1");
    const items = await listInfrastructureChecklistWith(testDb, "p-1");
    expect(items).toHaveLength(18);
    expect(items.every((i) => i.status === "PENDING")).toBe(true);
  });

  it("is idempotent — a second call does not duplicate rows", async () => {
    const { ensureInfrastructureChecklistWith, listInfrastructureChecklistWith } = await import(
      "./infrastructure"
    );
    await ensureInfrastructureChecklistWith(testDb, "p-1");
    await ensureInfrastructureChecklistWith(testDb, "p-1");
    const items = await listInfrastructureChecklistWith(testDb, "p-1");
    expect(items).toHaveLength(18);
  });

  it("scopes checklists to their project", async () => {
    const { ensureInfrastructureChecklistWith, listInfrastructureChecklistWith } = await import(
      "./infrastructure"
    );
    await ensureInfrastructureChecklistWith(testDb, "p-1");
    await ensureInfrastructureChecklistWith(testDb, "p-2");
    const items = await listInfrastructureChecklistWith(testDb, "p-1");
    expect(items).toHaveLength(18);
    expect(items.every((i) => i.projectId === "p-1")).toBe(true);
  });
});

describe("completeInfrastructureItemWith", () => {
  it("marks an item COMPLETE with completedBy/completedAt", async () => {
    const {
      ensureInfrastructureChecklistWith,
      listInfrastructureChecklistWith,
      completeInfrastructureItemWith,
    } = await import("./infrastructure");
    await ensureInfrastructureChecklistWith(testDb, "p-1");
    const [item] = await listInfrastructureChecklistWith(testDb, "p-1");
    await completeInfrastructureItemWith(testDb, item.id, "u-district-1");
    const [updated] = (await listInfrastructureChecklistWith(testDb, "p-1")).filter(
      (i) => i.id === item.id
    );
    expect(updated.status).toBe("COMPLETE");
    expect(updated.completedBy).toBe("u-district-1");
    expect(updated.completedAt).not.toBeNull();
  });

  it("rejects completing an already-COMPLETE item", async () => {
    const {
      ensureInfrastructureChecklistWith,
      listInfrastructureChecklistWith,
      completeInfrastructureItemWith,
    } = await import("./infrastructure");
    await ensureInfrastructureChecklistWith(testDb, "p-1");
    const [item] = await listInfrastructureChecklistWith(testDb, "p-1");
    await completeInfrastructureItemWith(testDb, item.id, "u-district-1");
    await expect(completeInfrastructureItemWith(testDb, item.id, "u-district-1")).rejects.toThrow();
  });
});
