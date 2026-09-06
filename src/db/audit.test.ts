import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { createTestDb } from "./test-helpers";
import {
  recordAuditWith,
  withAuditWith,
  listAuditEntriesWith,
  getEntityHistoryWith,
  verifyAuditLogWith,
} from "./audit";
import { diffRecords, canonicalize, GENESIS_HASH } from "@/lib/audit";

const ACTOR = { userId: "u-district", role: "district" };

describe("diffRecords", () => {
  it("reports only the fields that changed", () => {
    const changes = diffRecords(
      { status: "NOTIFIED", village: "Perungudi", areaHectares: 0.84 },
      { status: "AWARDED", village: "Perungudi", areaHectares: 0.84 }
    );
    expect(changes).toEqual([{ field: "status", before: "NOTIFIED", after: "AWARDED" }]);
  });

  it("treats a Date and its ISO string as the same value", () => {
    const when = new Date("2026-03-01T00:00:00.000Z");
    expect(diffRecords({ paidAt: when }, { paidAt: when.toISOString() })).toEqual([]);
  });

  it("treats an absent field and an explicitly null one alike", () => {
    expect(diffRecords({ note: undefined }, { note: null })).toEqual([]);
  });

  it("ignores updatedAt, which changes on every write and means nothing", () => {
    expect(
      diffRecords({ updatedAt: new Date(1), status: "A" }, { updatedAt: new Date(2), status: "A" })
    ).toEqual([]);
  });
});

describe("canonicalize", () => {
  it("serializes structurally equal objects identically regardless of key order", () => {
    expect(canonicalize({ b: 1, a: { d: 2, c: 3 } })).toBe(canonicalize({ a: { c: 3, d: 2 }, b: 1 }));
  });
});

describe("the audit ledger", () => {
  it("chains entries from genesis and verifies", async () => {
    const db = await createTestDb();
    await recordAuditWith(db, {
      actor: ACTOR,
      action: "CREATE",
      entityType: "PARCEL",
      entityId: "pcl-1",
      projectId: "p-1",
      summary: "Added parcel 112/2A",
      after: { surveyNumber: "112/2A" },
    });
    await recordAuditWith(db, {
      actor: ACTOR,
      action: "STATUS_CHANGE",
      entityType: "PARCEL",
      entityId: "pcl-1",
      projectId: "p-1",
      summary: "Advanced parcel 112/2A",
      before: { status: "NOTIFIED" },
      after: { status: "AWARDED" },
    });

    const entries = await listAuditEntriesWith(db);
    expect(entries).toHaveLength(2);
    // Newest first, so [1] is the genesis-linked entry.
    expect(entries[1].prevHash).toBe(GENESIS_HASH);
    expect(entries[0].prevHash).toBe(entries[1].hash);

    const verified = await verifyAuditLogWith(db);
    expect(verified.valid).toBe(true);
    expect(verified.checked).toBe(2);
  });

  it("detects an entry edited after the fact", async () => {
    const db = await createTestDb();
    await recordAuditWith(db, {
      actor: ACTOR,
      action: "PAY",
      entityType: "COMPENSATION",
      entityId: "c-1",
      projectId: "p-1",
      summary: "Recorded payment of 1200000",
      after: { total: 1200000 },
    });
    await recordAuditWith(db, {
      actor: ACTOR,
      action: "PAY",
      entityType: "COMPENSATION",
      entityId: "c-2",
      projectId: "p-1",
      summary: "Recorded payment of 900000",
      after: { total: 900000 },
    });

    expect((await verifyAuditLogWith(db)).valid).toBe(true);

    // Someone quietly rewrites the amount on the first payment. The row's
    // own hash no longer covers its contents, and it is the earliest break.
    await db.run(sql`UPDATE audit_log SET after = '{"total":99}' WHERE seq = 1`);

    const verified = await verifyAuditLogWith(db);
    expect(verified.valid).toBe(false);
    expect(verified.brokenAt?.index).toBe(0);
    expect(verified.brokenAt?.reason).toMatch(/do not match its recorded hash/);
  });

  it("detects a deleted entry", async () => {
    const db = await createTestDb();
    for (const id of ["a", "b", "c"]) {
      await recordAuditWith(db, {
        actor: ACTOR,
        action: "CREATE",
        entityType: "FAMILY",
        entityId: id,
        projectId: "p-1",
        summary: `Registered family ${id}`,
        after: { name: id },
      });
    }
    await db.run(sql`DELETE FROM audit_log WHERE seq = 2`);

    const verified = await verifyAuditLogWith(db);
    expect(verified.valid).toBe(false);
    expect(verified.brokenAt?.reason).toMatch(/prevHash/);
  });

  it("stores only the changed fields for an update", async () => {
    const db = await createTestDb();
    await recordAuditWith(db, {
      actor: ACTOR,
      action: "UPDATE",
      entityType: "LEGAL_DISPUTE",
      entityId: "d-1",
      projectId: "p-1",
      summary: "Updated case W.P. 4412/2026",
      reason: "Hearing rescheduled by the court",
      before: { status: "PENDING", court: "Madras High Court", outcome: null },
      after: { status: "DISPOSED", court: "Madras High Court", outcome: null },
    });

    const [entry] = await listAuditEntriesWith(db);
    expect(entry.before).toEqual({ status: "PENDING" });
    expect(entry.after).toEqual({ status: "DISPOSED" });
    expect(entry.changes).toEqual([{ field: "status", before: "PENDING", after: "DISPOSED" }]);
    expect(entry.reason).toBe("Hearing rescheduled by the court");
  });

  it("withAudit reads the record either side of the mutation", async () => {
    const db = await createTestDb();
    let status = "PENDING";
    await withAuditWith(
      db,
      {
        actor: ACTOR,
        action: "STATUS_CHANGE",
        entityType: "INFRASTRUCTURE_ITEM",
        entityId: "i-1",
        projectId: "p-1",
        summary: "Marked school building complete",
        loadBefore: async () => ({ status }),
        loadAfter: async () => ({ status }),
      },
      async () => {
        status = "COMPLETE";
      }
    );

    const [entry] = await listAuditEntriesWith(db);
    expect(entry.changes).toEqual([{ field: "status", before: "PENDING", after: "COMPLETE" }]);
  });

  it("returns one record's history oldest first", async () => {
    const db = await createTestDb();
    for (const summary of ["Registered", "Assessed", "Paid"]) {
      await recordAuditWith(db, {
        actor: ACTOR,
        action: "UPDATE",
        entityType: "PARCEL",
        entityId: "pcl-9",
        projectId: "p-1",
        summary,
        before: { s: summary + "-before" },
        after: { s: summary },
      });
      await recordAuditWith(db, {
        actor: ACTOR,
        action: "UPDATE",
        entityType: "PARCEL",
        entityId: "pcl-other",
        projectId: "p-1",
        summary: "noise",
        after: { s: "x" },
      });
    }

    const history = await getEntityHistoryWith(db, "PARCEL", "pcl-9");
    expect(history.map((h) => h.summary)).toEqual(["Registered", "Assessed", "Paid"]);
  });

  it("filters by project, entity type and actor", async () => {
    const db = await createTestDb();
    await recordAuditWith(db, {
      actor: ACTOR,
      action: "CREATE",
      entityType: "PARCEL",
      entityId: "pcl-1",
      projectId: "p-1",
      summary: "a",
      after: {},
    });
    await recordAuditWith(db, {
      actor: { userId: "u-state", role: "state" },
      action: "CREATE",
      entityType: "TENDER",
      entityId: "t-1",
      projectId: "p-2",
      summary: "b",
      after: {},
    });

    expect(await listAuditEntriesWith(db, { projectId: "p-1" })).toHaveLength(1);
    expect(await listAuditEntriesWith(db, { entityType: "TENDER" })).toHaveLength(1);
    expect(await listAuditEntriesWith(db, { actorId: "u-state" })).toHaveLength(1);
    expect(await listAuditEntriesWith(db, { actorId: "nobody" })).toHaveLength(0);
  });

  it("keeps the chain intact when writes are issued concurrently", async () => {
    // The tail read and the append are not one statement, so unserialized
    // concurrent writes would hand two entries the same predecessor.
    const db = await createTestDb();
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        recordAuditWith(db, {
          actor: ACTOR,
          action: "CREATE",
          entityType: "FAMILY",
          entityId: `f-${i}`,
          projectId: "p-1",
          summary: `Registered family ${i}`,
          after: { i },
        })
      )
    );

    const verified = await verifyAuditLogWith(db);
    expect(verified.valid).toBe(true);
    expect(verified.checked).toBe(25);
  });
});

/* ── Coverage enforcement ─────────────────────────────────────────────── */

const API_ROOT = join(process.cwd(), "src/app/api");

/**
 * Routes that legitimately write nothing to the domain record set.
 *
 * Anything not listed here that exports a mutating handler must record an
 * audit entry. Adding a route to this list is a deliberate act that shows
 * up in review — which is the point.
 */
const AUDIT_EXEMPT = new Set([
  // Clears a cookie. No record changes.
  "auth/logout/route.ts",
  // Per-user "I have seen the notification bell" marker. UI state, not a
  // record of the acquisition, and auditing it would bury real entries.
  "notifications/mark-seen/route.ts",
]);

function mutatingRouteFiles(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...mutatingRouteFiles(join(dir, entry.name), rel));
    } else if (entry.name === "route.ts") {
      const source = readFileSync(join(dir, entry.name), "utf-8");
      if (/export async function (POST|PATCH|PUT|DELETE)\b/.test(source)) {
        out.push(rel);
      }
    }
  }
  return out;
}

describe("audit coverage", () => {
  it("every mutating API route records to the audit ledger", () => {
    const unaudited = mutatingRouteFiles(API_ROOT).filter((rel) => {
      if (AUDIT_EXEMPT.has(rel)) return false;
      const source = readFileSync(join(API_ROOT, rel), "utf-8");
      return !/from "@\/db\/audit"/.test(source);
    });

    expect(
      unaudited,
      `These routes change records without writing an audit entry. Wire them ` +
        `through recordAudit/withAudit from "@/db/audit", or add them to ` +
        `AUDIT_EXEMPT with a reason if they genuinely change no record:\n  ` +
        unaudited.join("\n  ")
    ).toEqual([]);
  });

  it("the exemption list does not name routes that no longer exist", () => {
    const all = new Set(mutatingRouteFiles(API_ROOT));
    expect([...AUDIT_EXEMPT].filter((rel) => !all.has(rel))).toEqual([]);
  });
});
