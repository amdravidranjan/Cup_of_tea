# Compensation & R&R (Phase 1: Compensation Calculator) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the real RFCTLARR Section 26–30 compensation formula — not a free-text amount field — so per-parcel compensation is computed from a circle rate, area, multiplier, solatium, and statutory interest, using dates pulled directly from the project's own audit trail. This is the highest-research-backed feature in the app; the goal is to make that research load-bearing, not decorative.

**Architecture:** Builds directly on the GIS plan's parcels (for area) and the foundation plan's stage-history audit trail (for the two dates the formula needs — SIA notification date and award date — instead of asking a user to re-enter dates that are already recorded). Compensation rates are versioned by append-only insert (same pattern as the documents module's version history) rather than mutated in place — this directly answers the CAG audit's #1 documented failure (stale rates silently applied after a revision). Each assessed compensation record snapshots the rate/multiplier used at assessment time, so a later rate change never retroactively alters an already-assessed amount.

**Tech Stack:** No new dependencies — existing Next.js/Drizzle/libsql/Vitest stack.

**Spec:** `docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md` (Section 2.1 "Compensation formula", Section 6.2 "Compensation & R&R")

## Global Constraints

- Same as prior plans: RBAC enforced server-side, DB/auth/storage remain stubbed, single Next.js monolith.
- Compensation records **snapshot** the rate/multiplier/dates used, never recompute retroactively from the current rate table — an assessed amount must stay stable even if the rate is later revised.
- Interest is computed on the **base market value** (pre-multiplier), per Section 30(3)'s literal text ("12% per annum on such market value") — not on the multiplied or solatium-inclusive amount.
- Compensation can only be assessed once a project has actually reached the point in its real lifecycle where both required dates exist (SIA notification published, award passed) — never allow assessing against a guessed or defaulted date.

---

### Task 1: Compensation schema

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/lib/compensation-status.ts`

**Interfaces:**
- Produces:
  - `compensationRates` table: `{ id, state, district, ratePerHectare: real, multiplier: real, setBy, createdAt }` — the "current" rate for a (state, district) pair is whichever row has the latest `createdAt`.
  - `compensations` table: `{ id, parcelId, projectId, ratePerHectare: real, multiplier: real, assetsValue: real, marketValue: real, multipliedMarketValue: real, solatium: real, interest: real, total: real, status: text, assessedBy, assessedAt, paidAt: nullable }`
  - `COMPENSATION_STATUSES: readonly ["ASSESSED", "PAID"]` and `type CompensationStatus`

- [ ] **Step 1: Write `src/lib/compensation-status.ts`**

```ts
export const COMPENSATION_STATUSES = ["ASSESSED", "PAID"] as const;
export type CompensationStatus = (typeof COMPENSATION_STATUSES)[number];
```

- [ ] **Step 2: Add tables to `src/db/schema.ts`**

Append after `parcels`:

```ts
export const compensationRates = sqliteTable("compensation_rates", {
  id: text("id").primaryKey(),
  state: text("state").notNull(),
  district: text("district").notNull(),
  ratePerHectare: real("rate_per_hectare").notNull(),
  multiplier: real("multiplier").notNull(),
  setBy: text("set_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const compensations = sqliteTable("compensations", {
  id: text("id").primaryKey(),
  parcelId: text("parcel_id").notNull(),
  projectId: text("project_id").notNull(),
  ratePerHectare: real("rate_per_hectare").notNull(),
  multiplier: real("multiplier").notNull(),
  assetsValue: real("assets_value").notNull(),
  marketValue: real("market_value").notNull(),
  multipliedMarketValue: real("multiplied_market_value").notNull(),
  solatium: real("solatium").notNull(),
  interest: real("interest").notNull(),
  total: real("total").notNull(),
  status: text("status").notNull(),
  assessedBy: text("assessed_by").notNull(),
  assessedAt: integer("assessed_at", { mode: "timestamp" }).notNull(),
  paidAt: integer("paid_at", { mode: "timestamp" }),
});
```

- [ ] **Step 3: Push and verify**

```bash
lsof -ti:3000 -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
npm run db:push
```

Expected: completes without error.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts src/lib/compensation-status.ts
git commit -m "feat: add compensation rates and records schema"
```

---

### Task 2: Compensation formula and date resolution (pure, tested)

**Files:**
- Create: `src/lib/compensation.ts`
- Test: `src/lib/compensation.test.ts`

**Interfaces:**
- Produces:
  - `interface CompensationInput { areaHectares: number; ratePerHectare: number; multiplier: number; assetsValue: number; sIANotificationDate: Date; awardDate: Date }`
  - `interface CompensationBreakdown { marketValue: number; multipliedMarketValue: number; assetsValue: number; solatium: number; interest: number; total: number }`
  - `function calculateCompensation(input: CompensationInput): CompensationBreakdown`
  - `interface StageHistoryEntry { action: string; toStage: string; createdAt: Date }`
  - `interface CompensationDates { sIANotificationDate: Date; awardDate: Date }`
  - `function resolveCompensationDates(history: StageHistoryEntry[]): CompensationDates | null` — reads the `SIA:COMPLETE→NOTIFIED` and `DECLARED:PASS_AWARD→AWARDED` transitions from the project's own stage history; returns `null` if the project hasn't reached AWARDED yet.
  - Both used by the parcel-compensation API route (Task 5).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/compensation.test.ts
import { describe, it, expect } from "vitest";
import { calculateCompensation, resolveCompensationDates } from "./compensation";

describe("calculateCompensation", () => {
  it("computes market value, multiplier, solatium, and total with no interest when dates match", () => {
    const result = calculateCompensation({
      areaHectares: 2,
      ratePerHectare: 500_000,
      multiplier: 1.5,
      assetsValue: 0,
      sIANotificationDate: new Date("2026-01-01"),
      awardDate: new Date("2026-01-01"),
    });
    expect(result.marketValue).toBe(1_000_000);
    expect(result.multipliedMarketValue).toBe(1_500_000);
    expect(result.interest).toBe(0);
    expect(result.solatium).toBe(1_500_000);
    expect(result.total).toBe(3_000_000);
  });

  it("adds 12% p.a. interest on the base market value over the elapsed period", () => {
    const result = calculateCompensation({
      areaHectares: 2,
      ratePerHectare: 500_000,
      multiplier: 1.5,
      assetsValue: 0,
      sIANotificationDate: new Date("2025-01-01"),
      awardDate: new Date("2026-01-01"),
    });
    // 2025-01-01 to 2026-01-01 is 365 days, not exactly 365.25 (a full
    // Gregorian year average) — the interest is ~119,918, not exactly
    // 120,000. Precision -3 (tolerance ±500) tolerates that real-calendar
    // slack without being so loose it'd pass a wrong formula.
    expect(result.interest).toBeCloseTo(120_000, -3);
    expect(result.total).toBeCloseTo(3_120_000, -3);
  });

  it("includes assetsValue in solatium and total, but not in interest", () => {
    const result = calculateCompensation({
      areaHectares: 2,
      ratePerHectare: 500_000,
      multiplier: 1.5,
      assetsValue: 200_000,
      sIANotificationDate: new Date("2026-01-01"),
      awardDate: new Date("2026-01-01"),
    });
    expect(result.solatium).toBe(1_700_000);
    expect(result.total).toBe(3_400_000);
  });
});

describe("resolveCompensationDates", () => {
  it("returns null when the project hasn't reached AWARDED", () => {
    const history = [
      { action: "CREATE", toStage: "DRAFT", createdAt: new Date("2026-01-01") },
      { action: "SUBMIT", toStage: "SCRUTINY", createdAt: new Date("2026-01-02") },
    ];
    expect(resolveCompensationDates(history)).toBeNull();
  });

  it("returns null when SIA notification happened but the project isn't awarded yet", () => {
    const history = [
      { action: "COMPLETE", toStage: "NOTIFIED", createdAt: new Date("2026-01-05") },
    ];
    expect(resolveCompensationDates(history)).toBeNull();
  });

  it("resolves both dates once the project has been awarded", () => {
    const history = [
      { action: "CREATE", toStage: "DRAFT", createdAt: new Date("2026-01-01") },
      { action: "COMPLETE", toStage: "NOTIFIED", createdAt: new Date("2026-01-05") },
      { action: "STATE_APPROVE", toStage: "STATE_APPROVED", createdAt: new Date("2026-01-10") },
      { action: "PASS_AWARD", toStage: "AWARDED", createdAt: new Date("2026-06-01") },
    ];
    const dates = resolveCompensationDates(history);
    expect(dates?.sIANotificationDate).toEqual(new Date("2026-01-05"));
    expect(dates?.awardDate).toEqual(new Date("2026-06-01"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/compensation.test.ts`
Expected: FAIL — `Cannot find module './compensation'`.

- [ ] **Step 3: Write `src/lib/compensation.ts`**

```ts
export interface CompensationInput {
  areaHectares: number;
  ratePerHectare: number;
  multiplier: number;
  assetsValue: number;
  sIANotificationDate: Date;
  awardDate: Date;
}

export interface CompensationBreakdown {
  marketValue: number;
  multipliedMarketValue: number;
  assetsValue: number;
  solatium: number;
  interest: number;
  total: number;
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const SOLATIUM_RATE = 1.0; // 100% minimum per Section 30(1)
const INTEREST_RATE_PER_ANNUM = 0.12; // Section 30(3)

export function calculateCompensation(input: CompensationInput): CompensationBreakdown {
  const marketValue = input.areaHectares * input.ratePerHectare;
  const multipliedMarketValue = marketValue * input.multiplier;
  const years =
    (input.awardDate.getTime() - input.sIANotificationDate.getTime()) / MS_PER_YEAR;
  const interest = years > 0 ? marketValue * INTEREST_RATE_PER_ANNUM * years : 0;
  const solatium = (multipliedMarketValue + input.assetsValue) * SOLATIUM_RATE;
  const total = multipliedMarketValue + input.assetsValue + solatium + interest;
  return {
    marketValue,
    multipliedMarketValue,
    assetsValue: input.assetsValue,
    solatium,
    interest,
    total,
  };
}

export interface StageHistoryEntry {
  action: string;
  toStage: string;
  createdAt: Date;
}

export interface CompensationDates {
  sIANotificationDate: Date;
  awardDate: Date;
}

export function resolveCompensationDates(
  history: StageHistoryEntry[]
): CompensationDates | null {
  const notification = history.find(
    (h) => h.action === "COMPLETE" && h.toStage === "NOTIFIED"
  );
  const award = history.find((h) => h.action === "PASS_AWARD" && h.toStage === "AWARDED");
  if (!notification || !award) return null;
  return { sIANotificationDate: notification.createdAt, awardDate: award.createdAt };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/compensation.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/compensation.ts src/lib/compensation.test.ts
git commit -m "feat: add RFCTLARR Section 26-30 compensation formula and date resolution"
```

---

### Task 3: Compensation data access layer + parcel lookup (tested against in-memory DB)

**Files:**
- Create: `src/db/compensation.ts`
- Test: `src/db/compensation.test.ts`
- Modify: `src/db/parcels.ts`
- Modify: `src/db/parcels.test.ts`

**Interfaces:**
- Consumes: `compensationRates`/`compensations` tables (Task 1), `CompensationStatus` (Task 1)
- Produces:
  - `async function setCompensationRateWith(database, input): Promise<string>`
  - `async function getCurrentCompensationRateWith(database, state, district)` — latest row by `createdAt` for that (state, district), or `null`.
  - `async function createCompensationWith(database, input): Promise<string>` — always inserts with `status: "ASSESSED"`.
  - `async function listCompensationsForProjectWith(database, projectId)`
  - `async function markCompensationPaidWith(database, id): Promise<void>` — sets `status: "PAID"`, `paidAt: now`.
  - Zero-arg convenience wrappers for all five — used by Task 5's API routes.
  - **In `parcels.ts`:** `async function getParcelWith(database, id): Promise<Parcel | null>` and its `getParcel` wrapper — needed by the assess-compensation route to read a parcel's `areaHectares`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/db/compensation.test.ts
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
    CREATE TABLE compensation_rates (
      id TEXT PRIMARY KEY, state TEXT NOT NULL, district TEXT NOT NULL,
      rate_per_hectare REAL NOT NULL, multiplier REAL NOT NULL,
      set_by TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);
  await testDb.run(sql`
    CREATE TABLE compensations (
      id TEXT PRIMARY KEY, parcel_id TEXT NOT NULL, project_id TEXT NOT NULL,
      rate_per_hectare REAL NOT NULL, multiplier REAL NOT NULL, assets_value REAL NOT NULL,
      market_value REAL NOT NULL, multiplied_market_value REAL NOT NULL,
      solatium REAL NOT NULL, interest REAL NOT NULL, total REAL NOT NULL,
      status TEXT NOT NULL, assessed_by TEXT NOT NULL, assessed_at INTEGER NOT NULL,
      paid_at INTEGER
    );
  `);
});

describe("compensation rates", () => {
  it("returns null when no rate has been set", async () => {
    const { getCurrentCompensationRateWith } = await import("./compensation");
    expect(await getCurrentCompensationRateWith(testDb, "Odisha", "Koraput")).toBeNull();
  });

  it("returns the most recently set rate for a state/district", async () => {
    const { setCompensationRateWith, getCurrentCompensationRateWith } = await import(
      "./compensation"
    );
    await setCompensationRateWith(testDb, {
      state: "Odisha",
      district: "Koraput",
      ratePerHectare: 1_000_000,
      multiplier: 1,
      setBy: "u-district-1",
    });
    // createdAt is stored with whole-second precision (drizzle's sqlite
    // `integer(..., { mode: "timestamp" })` truncates to Unix seconds,
    // confirmed by direct inspection) — real rate-setting never happens
    // twice within the same second, but this test has to straddle a
    // second boundary to observe "latest wins".
    await new Promise((r) => setTimeout(r, 1100));
    await setCompensationRateWith(testDb, {
      state: "Odisha",
      district: "Koraput",
      ratePerHectare: 1_500_000,
      multiplier: 1.5,
      setBy: "u-district-1",
    });
    const current = await getCurrentCompensationRateWith(testDb, "Odisha", "Koraput");
    expect(current?.ratePerHectare).toBe(1_500_000);
    expect(current?.multiplier).toBe(1.5);
  });
});

describe("compensation records", () => {
  const baseRecord = {
    parcelId: "parcel-1",
    projectId: "project-1",
    ratePerHectare: 1_000_000,
    multiplier: 1,
    assetsValue: 0,
    marketValue: 1_000_000,
    multipliedMarketValue: 1_000_000,
    solatium: 1_000_000,
    interest: 0,
    total: 2_000_000,
    assessedBy: "u-district-1",
  };

  it("creates a compensation record with ASSESSED status", async () => {
    const { createCompensationWith, listCompensationsForProjectWith } = await import(
      "./compensation"
    );
    await createCompensationWith(testDb, baseRecord);
    const list = await listCompensationsForProjectWith(testDb, "project-1");
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe("ASSESSED");
    expect(list[0].total).toBe(2_000_000);
  });

  it("marks a record as PAID with a paidAt timestamp", async () => {
    const { createCompensationWith, markCompensationPaidWith, listCompensationsForProjectWith } =
      await import("./compensation");
    const id = await createCompensationWith(testDb, baseRecord);
    await markCompensationPaidWith(testDb, id);
    const list = await listCompensationsForProjectWith(testDb, "project-1");
    expect(list[0].status).toBe("PAID");
    expect(list[0].paidAt).not.toBeNull();
  });

  it("scopes compensation records to their project", async () => {
    const { createCompensationWith, listCompensationsForProjectWith } = await import(
      "./compensation"
    );
    await createCompensationWith(testDb, baseRecord);
    await createCompensationWith(testDb, { ...baseRecord, projectId: "project-2" });
    const list = await listCompensationsForProjectWith(testDb, "project-1");
    expect(list).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/db/compensation.test.ts`
Expected: FAIL — `Cannot find module './compensation'`.

- [ ] **Step 3: Write `src/db/compensation.ts`**

```ts
import { and, desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import { compensationRates, compensations } from "./schema";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

export interface SetCompensationRateInput {
  state: string;
  district: string;
  ratePerHectare: number;
  multiplier: number;
  setBy: string;
}

export async function setCompensationRateWith(
  database: Db,
  input: SetCompensationRateInput
): Promise<string> {
  const id = crypto.randomUUID();
  await database.insert(compensationRates).values({
    id,
    state: input.state,
    district: input.district,
    ratePerHectare: input.ratePerHectare,
    multiplier: input.multiplier,
    setBy: input.setBy,
    createdAt: new Date(),
  });
  return id;
}

export async function getCurrentCompensationRateWith(
  database: Db,
  state: string,
  district: string
) {
  const rows = await database
    .select()
    .from(compensationRates)
    .where(and(eq(compensationRates.state, state), eq(compensationRates.district, district)))
    .orderBy(desc(compensationRates.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export interface CreateCompensationInput {
  parcelId: string;
  projectId: string;
  ratePerHectare: number;
  multiplier: number;
  assetsValue: number;
  marketValue: number;
  multipliedMarketValue: number;
  solatium: number;
  interest: number;
  total: number;
  assessedBy: string;
}

export async function createCompensationWith(
  database: Db,
  input: CreateCompensationInput
): Promise<string> {
  const id = crypto.randomUUID();
  await database.insert(compensations).values({
    id,
    parcelId: input.parcelId,
    projectId: input.projectId,
    ratePerHectare: input.ratePerHectare,
    multiplier: input.multiplier,
    assetsValue: input.assetsValue,
    marketValue: input.marketValue,
    multipliedMarketValue: input.multipliedMarketValue,
    solatium: input.solatium,
    interest: input.interest,
    total: input.total,
    status: "ASSESSED",
    assessedBy: input.assessedBy,
    assessedAt: new Date(),
    paidAt: null,
  });
  return id;
}

export async function listCompensationsForProjectWith(database: Db, projectId: string) {
  return database.select().from(compensations).where(eq(compensations.projectId, projectId));
}

export async function markCompensationPaidWith(database: Db, id: string): Promise<void> {
  await database
    .update(compensations)
    .set({ status: "PAID", paidAt: new Date() })
    .where(eq(compensations.id, id));
}

export const setCompensationRate = (input: SetCompensationRateInput) =>
  setCompensationRateWith(defaultDb, input);
export const getCurrentCompensationRate = (state: string, district: string) =>
  getCurrentCompensationRateWith(defaultDb, state, district);
export const createCompensation = (input: CreateCompensationInput) =>
  createCompensationWith(defaultDb, input);
export const listCompensationsForProject = (projectId: string) =>
  listCompensationsForProjectWith(defaultDb, projectId);
export const markCompensationPaid = (id: string) => markCompensationPaidWith(defaultDb, id);
```

- [ ] **Step 4: Add `getParcelWith`/`getParcel` to `src/db/parcels.ts`**

Add after `listParcelsWith`:

```ts
export async function getParcelWith(database: Db, id: string): Promise<Parcel | null> {
  const rows = await database.select().from(parcels).where(eq(parcels.id, id));
  return rows[0] ? toParcel(rows[0]) : null;
}
```

Add alongside the existing convenience wrappers:

```ts
export const getParcel = (id: string) => getParcelWith(defaultDb, id);
```

Add a test to `src/db/parcels.test.ts` (append to the `describe("parcels data layer", ...)` block):

```ts
it("fetches a single parcel by id", async () => {
  const { createParcelWith, getParcelWith } = await import("./parcels");
  const id = await createParcelWith(testDb, {
    projectId: "p-1",
    village: "Similiguda",
    areaHectares: 1.2,
    status: "NOTIFIED",
    geometry: square,
  });
  const parcel = await getParcelWith(testDb, id);
  expect(parcel?.village).toBe("Similiguda");
  expect(parcel?.projectId).toBe("p-1");
});
```

- [ ] **Step 5: Run all tests to verify they pass**

Run: `npx vitest run src/db/compensation.test.ts src/db/parcels.test.ts`
Expected: PASS — 5 tests in `compensation.test.ts`, 3 in `parcels.test.ts` (2 existing + 1 new).

- [ ] **Step 6: Commit**

```bash
git add src/db/compensation.ts src/db/compensation.test.ts src/db/parcels.ts src/db/parcels.test.ts
git commit -m "feat: add compensation data access layer and single-parcel lookup"
```

---

### Task 4: RBAC permissions for compensation (tested)

**Files:**
- Modify: `src/lib/rbac.ts`
- Modify: `src/lib/rbac.test.ts`

**Interfaces:**
- Produces: `Permission` gains `"compensation:manage-rate"` (district, state — rate-setting is a district/state revenue function) and `"compensation:assess"` (district only — matches district's operational role in every other stage of the workflow). Used by Task 5's API routes.

- [ ] **Step 1: Add the failing tests** (append to the existing `describe("can", ...)` block)

```ts
it("allows district and state to manage the compensation rate", () => {
  expect(can("district", "compensation:manage-rate")).toBe(true);
  expect(can("state", "compensation:manage-rate")).toBe(true);
});

it("does not allow agency, central, or field to manage the compensation rate", () => {
  expect(can("agency", "compensation:manage-rate")).toBe(false);
  expect(can("central", "compensation:manage-rate")).toBe(false);
  expect(can("field", "compensation:manage-rate")).toBe(false);
});

it("only allows district to assess compensation", () => {
  expect(can("district", "compensation:assess")).toBe(true);
  expect(can("agency", "compensation:assess")).toBe(false);
  expect(can("state", "compensation:assess")).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/rbac.test.ts`
Expected: FAIL — assertion mismatches (permissions not yet granted).

- [ ] **Step 3: Update `src/lib/rbac.ts`**

Add to the `Permission` union:

```ts
  | "compensation:manage-rate"
  | "compensation:assess";
```

Update `ROLE_PERMISSIONS`:

```ts
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  agency: [
    "project:create",
    "project:view:own",
    "project:transition",
    "document:upload",
    "project:geometry:edit",
  ],
  district: [
    "project:create",
    "project:view:own",
    "project:transition",
    "document:upload",
    "project:geometry:edit",
    "compensation:manage-rate",
    "compensation:assess",
  ],
  state: ["project:view:all", "project:transition", "compensation:manage-rate"],
  central: ["project:view:all", "project:transition"],
  field: ["project:view:own", "document:upload"],
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/rbac.test.ts`
Expected: PASS, 12 tests (9 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rbac.ts src/lib/rbac.test.ts
git commit -m "feat: add compensation rate and assessment permissions"
```

---

### Task 5: Compensation API routes

**Files:**
- Create: `src/app/api/projects/[id]/compensation-rate/route.ts`
- Create: `src/app/api/projects/[id]/compensation/route.ts`
- Create: `src/app/api/parcels/[parcelId]/compensation/route.ts`
- Create: `src/app/api/compensation/[id]/pay/route.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–4 plus `getProject`/`getStageHistory` (existing), `getParcel` (Task 3)
- Produces:
  - `GET /api/projects/[id]/compensation-rate` → `{ rate: CompensationRate | null }`
  - `POST /api/projects/[id]/compensation-rate` — body `{ ratePerHectare, multiplier }` → `{ id }`, 201
  - `GET /api/projects/[id]/compensation` → `{ compensations: Compensation[] }`
  - `POST /api/parcels/[parcelId]/compensation` — body `{ projectId, assetsValue }` → `{ id, breakdown }`, 201 (400 if the project hasn't reached AWARDED, or no rate is set for its district)
  - `POST /api/compensation/[id]/pay` → `{ ok: true }`

- [ ] **Step 1: Write `src/app/api/projects/[id]/compensation-rate/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getProject } from "@/db/projects";
import { getCurrentCompensationRate, setCompensationRate } from "@/db/compensation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const rate = await getCurrentCompensationRate(project.state, project.district);
  return NextResponse.json({ rate });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "compensation:manage-rate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as { ratePerHectare?: number; multiplier?: number };
  if (typeof body.ratePerHectare !== "number" || typeof body.multiplier !== "number") {
    return NextResponse.json({ error: "Invalid rate" }, { status: 400 });
  }
  const rateId = await setCompensationRate({
    state: project.state,
    district: project.district,
    ratePerHectare: body.ratePerHectare,
    multiplier: body.multiplier,
    setBy: session.userId,
  });
  return NextResponse.json({ id: rateId }, { status: 201 });
}
```

- [ ] **Step 2: Write `src/app/api/projects/[id]/compensation/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listCompensationsForProject } from "@/db/compensation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const list = await listCompensationsForProject(id);
  return NextResponse.json({ compensations: list });
}
```

- [ ] **Step 3: Write `src/app/api/parcels/[parcelId]/compensation/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getParcel } from "@/db/parcels";
import { getProject, getStageHistory } from "@/db/projects";
import { getCurrentCompensationRate, createCompensation } from "@/db/compensation";
import { calculateCompensation, resolveCompensationDates } from "@/lib/compensation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ parcelId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "compensation:assess")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { parcelId } = await params;
  const body = (await request.json()) as { projectId?: string; assetsValue?: number };
  if (!body.projectId || typeof body.assetsValue !== "number") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const parcel = await getParcel(parcelId);
  if (!parcel || parcel.projectId !== body.projectId) {
    return NextResponse.json({ error: "Parcel not found for this project" }, { status: 404 });
  }
  const project = await getProject(body.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const history = await getStageHistory(body.projectId);
  const dates = resolveCompensationDates(history);
  if (!dates) {
    return NextResponse.json(
      { error: "Project has not reached the AWARDED stage yet" },
      { status: 400 }
    );
  }

  const rate = await getCurrentCompensationRate(project.state, project.district);
  if (!rate) {
    return NextResponse.json(
      { error: "No compensation rate set for this district" },
      { status: 400 }
    );
  }

  const breakdown = calculateCompensation({
    areaHectares: parcel.areaHectares,
    ratePerHectare: rate.ratePerHectare,
    multiplier: rate.multiplier,
    assetsValue: body.assetsValue,
    sIANotificationDate: dates.sIANotificationDate,
    awardDate: dates.awardDate,
  });

  const id = await createCompensation({
    parcelId,
    projectId: body.projectId,
    ratePerHectare: rate.ratePerHectare,
    multiplier: rate.multiplier,
    assetsValue: body.assetsValue,
    marketValue: breakdown.marketValue,
    multipliedMarketValue: breakdown.multipliedMarketValue,
    solatium: breakdown.solatium,
    interest: breakdown.interest,
    total: breakdown.total,
    assessedBy: session.userId,
  });
  return NextResponse.json({ id, breakdown }, { status: 201 });
}
```

- [ ] **Step 4: Write `src/app/api/compensation/[id]/pay/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { markCompensationPaid } from "@/db/compensation";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "compensation:assess")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await markCompensationPaid(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Manually verify the full flow**

This requires a project actually at AWARDED. Use the second demo project created during the foundation/detail-page plans' manual verification (or drive `p-demo-bridge-1` there now — it's fine, it's demo data):

```bash
npm run dev &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'

curl -s -c /tmp/c.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d '{"userId":"u-district-1"}' > /dev/null

echo "--- set a compensation rate ---"
curl -s -i -b /tmp/c.txt -X POST http://localhost:3000/api/projects/p-demo-bridge-1/compensation-rate \
  -H "Content-Type: application/json" -d '{"ratePerHectare":1500000,"multiplier":1.5}'

echo "--- drive the demo project to AWARDED (district performs every remaining step) ---"
for action in APPROVE COMPLETE STATE_APPROVE; do : ; done
curl -s -b /tmp/c.txt -X POST http://localhost:3000/api/projects/p-demo-bridge-1/transition -H "Content-Type: application/json" -d '{"action":"APPROVE"}'
curl -s -b /tmp/c.txt -X POST http://localhost:3000/api/projects/p-demo-bridge-1/transition -H "Content-Type: application/json" -d '{"action":"COMPLETE"}'
curl -s -b /tmp/c.txt -X POST http://localhost:3000/api/projects/p-demo-bridge-1/transition -H "Content-Type: application/json" -d '{"action":"STATE_APPROVE"}'
curl -s -b /tmp/c.txt -X POST http://localhost:3000/api/projects/p-demo-bridge-1/transition -H "Content-Type: application/json" -d '{"action":"CENTRAL_APPROVE"}'
curl -s -b /tmp/c.txt -X POST http://localhost:3000/api/projects/p-demo-bridge-1/transition -H "Content-Type: application/json" -d '{"action":"PUBLISH_DECLARATION"}'
curl -s -b /tmp/c.txt -X POST http://localhost:3000/api/projects/p-demo-bridge-1/transition -H "Content-Type: application/json" -d '{"action":"PASS_AWARD"}'

echo "--- get a parcel id ---"
PARCEL_ID=$(curl -s -b /tmp/c.txt http://localhost:3000/api/projects/p-demo-bridge-1/parcels | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "parcel: $PARCEL_ID"

echo "--- assess compensation ---"
curl -s -i -b /tmp/c.txt -X POST http://localhost:3000/api/parcels/$PARCEL_ID/compensation \
  -H "Content-Type: application/json" -d "{\"projectId\":\"p-demo-bridge-1\",\"assetsValue\":50000}"

echo "--- list compensations ---"
curl -s -b /tmp/c.txt http://localhost:3000/api/projects/p-demo-bridge-1/compensation
```

Note: `p-demo-bridge-1` was already at `DRAFT` or further depending on earlier manual testing in prior plans — if a transition 400s because the project is already past that stage, that's expected; skip ahead to whichever action is valid for its current stage (check via `GET /api/projects`), then continue.

Expected: rate POST → 201; each transition → 200 with the next stage; assess → 201 with a `breakdown` object (`multipliedMarketValue`, `solatium`, `interest`, `total` all present and non-zero if there's any gap between the SIA and award dates); list → 200 with one `ASSESSED` record.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/projects/[id]/compensation-rate" "src/app/api/projects/[id]/compensation" "src/app/api/parcels/[parcelId]/compensation" "src/app/api/compensation/[id]/pay"
git commit -m "feat: add compensation API routes"
```

---

### Task 6: Seed a compensation rate

**Files:**
- Modify: `src/db/seed.ts`

**Interfaces:**
- Consumes: `setCompensationRate` (Task 3)
- Produces: Odisha/Koraput has a compensation rate ready to use the moment a judge drives a project to AWARDED live — no separate setup step needed mid-demo. The demo project itself is deliberately **not** pre-advanced past DRAFT here — walking it through the full lifecycle live is already a proven, working demo moment (spec Section 9); pre-seeding an assessed compensation would skip past that.

- [ ] **Step 1: Add to `src/db/seed.ts`**

Add import:

```ts
import { setCompensationRate } from "./compensation";
```

Add before the final `console.log` line in `main()`:

```ts
  await setCompensationRate({
    state: "Odisha",
    district: "Koraput",
    ratePerHectare: 1_500_000,
    multiplier: 1.5,
    setBy: "u-district-1",
  });
```

- [ ] **Step 2: Re-seed and verify**

```bash
lsof -ti:3000 -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
rm -f local.db local.db-*
rm -rf uploads
npm run db:push
npm run db:seed
```

Expected: `Seed complete: 5 demo users, 1 demo project.` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: seed a compensation rate for Odisha/Koraput"
```

---

### Task 7: Compensation UI on the project detail page

**Files:**
- Create: `src/components/compensation-panel.tsx`
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `getCurrentCompensationRate`/`listCompensationsForProject` (Task 3), `resolveCompensationDates` (Task 2), `can` (existing)
- Produces: a "Compensation" section — a rate-setting form (district/state only), and per-parcel assess/pay controls gated on both permission and whether the project has actually reached AWARDED.

No automated test — same rationale as prior UI tasks. Verified manually.

- [ ] **Step 1: Write `src/components/compensation-panel.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface ParcelWithCompensation {
  id: string;
  village: string;
  areaHectares: number;
  compensation: { id: string; total: number; status: string } | null;
}

export function CompensationPanel({
  projectId,
  canManageRate,
  canAssess,
  datesResolved,
  currentRate,
  parcels,
}: {
  projectId: string;
  canManageRate: boolean;
  canAssess: boolean;
  datesResolved: boolean;
  currentRate: { ratePerHectare: number; multiplier: number } | null;
  parcels: ParcelWithCompensation[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSetRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("rate");
    setError(null);
    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/projects/${projectId}/compensation-rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ratePerHectare: Number(formData.get("ratePerHectare")),
        multiplier: Number(formData.get("multiplier")),
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      setError(body.error ?? "Failed to set rate");
      return;
    }
    router.refresh();
  }

  async function handleAssess(event: FormEvent<HTMLFormElement>, parcelId: string) {
    event.preventDefault();
    setPending(parcelId);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/parcels/${parcelId}/compensation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        assetsValue: Number(formData.get("assetsValue") ?? 0),
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      setError(body.error ?? "Failed to assess compensation");
      return;
    }
    router.refresh();
  }

  async function handlePay(compensationId: string) {
    setPending(compensationId);
    setError(null);
    const res = await fetch(`/api/compensation/${compensationId}/pay`, { method: "POST" });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      setError(body.error ?? "Failed to mark paid");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManageRate && (
        <form
          onSubmit={handleSetRate}
          className="flex flex-wrap items-end gap-2 rounded-md border border-gray-200 p-3"
        >
          <div>
            <label className="block text-xs text-gray-500" htmlFor="ratePerHectare">
              Rate (Rs/hectare)
            </label>
            <input
              id="ratePerHectare"
              name="ratePerHectare"
              type="number"
              step="any"
              required
              defaultValue={currentRate?.ratePerHectare}
              className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="multiplier">
              Multiplier
            </label>
            <input
              id="multiplier"
              name="multiplier"
              type="number"
              step="any"
              required
              defaultValue={currentRate?.multiplier ?? 1}
              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending !== null}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            {pending === "rate" ? "Saving..." : "Set current rate"}
          </button>
        </form>
      )}

      {!currentRate && (
        <p className="text-sm text-gray-500">No compensation rate set for this district yet.</p>
      )}

      {currentRate && !datesResolved && (
        <p className="text-sm text-gray-500">
          Compensation can be assessed once the project reaches the AWARDED stage (needs both
          the SIA notification date and the award date from its own history).
        </p>
      )}

      {currentRate && parcels.length > 0 && (
        <ul className="space-y-2">
          {parcels.map((p) => (
            <li key={p.id} className="rounded-md border border-gray-200 p-3 text-sm">
              <p className="font-medium">
                {p.village} — {p.areaHectares} ha
              </p>
              {p.compensation ? (
                <div className="mt-1 flex items-center gap-3">
                  <span>
                    Total: Rs {p.compensation.total.toLocaleString("en-IN")} —{" "}
                    {p.compensation.status}
                  </span>
                  {canAssess && p.compensation.status === "ASSESSED" && (
                    <button
                      type="button"
                      onClick={() => handlePay(p.compensation!.id)}
                      disabled={pending !== null}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
                    >
                      {pending === p.compensation.id ? "Working..." : "Mark paid"}
                    </button>
                  )}
                </div>
              ) : (
                canAssess &&
                datesResolved && (
                  <form
                    onSubmit={(e) => handleAssess(e, p.id)}
                    className="mt-1 flex items-end gap-2"
                  >
                    <div>
                      <label className="block text-xs text-gray-500">Assets value (Rs)</label>
                      <input
                        name="assetsValue"
                        type="number"
                        step="any"
                        defaultValue={0}
                        className="w-32 rounded-md border border-gray-300 px-2 py-1 text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={pending !== null}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
                    >
                      {pending === p.id ? "Assessing..." : "Assess compensation"}
                    </button>
                  </form>
                )
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Modify `src/app/(dashboard)/projects/[id]/page.tsx`**

Add imports:

```ts
import { getCurrentCompensationRate, listCompensationsForProject } from "@/db/compensation";
import { resolveCompensationDates } from "@/lib/compensation";
import { CompensationPanel } from "@/components/compensation-panel";
```

Add alongside the existing fetches (after `parcelsWithImpact` is computed):

```ts
  const compensationRate = await getCurrentCompensationRate(project.state, project.district);
  const compensationList = await listCompensationsForProject(id);
  const compensationDates = resolveCompensationDates(history);
  const canManageRate = can(session.role, "compensation:manage-rate");
  const canAssessCompensation = can(session.role, "compensation:assess");
  const compensationByParcel = new Map(compensationList.map((c) => [c.parcelId, c]));
  const parcelsWithCompensation = parcelsWithImpact.map((p) => {
    const comp = compensationByParcel.get(p.id);
    return {
      id: p.id,
      village: p.village,
      areaHectares: p.areaHectares,
      compensation: comp ? { id: comp.id, total: comp.total, status: comp.status } : null,
    };
  });
```

Add this section (after "Map" reads well, but exact position doesn't matter):

```tsx
      <div>
        <h3 className="mb-2 text-sm font-medium">Compensation</h3>
        <CompensationPanel
          projectId={project.id}
          canManageRate={canManageRate}
          canAssess={canAssessCompensation}
          datesResolved={compensationDates !== null}
          currentRate={
            compensationRate
              ? {
                  ratePerHectare: compensationRate.ratePerHectare,
                  multiplier: compensationRate.multiplier,
                }
              : null
          }
          parcels={parcelsWithCompensation}
        />
      </div>
```

- [ ] **Step 3: Verify data plumbing and type-check**

```bash
lsof -ti:3000 -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
npm run dev > /tmp/nextdev-comp.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'

curl -s -c /tmp/c.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d '{"userId":"u-district-1"}' > /dev/null
curl -s -b /tmp/c.txt http://localhost:3000/projects/p-demo-bridge-1 > /tmp/detail-comp.html
grep -o "Set current rate" /tmp/detail-comp.html
grep -aiE "error" /tmp/nextdev-comp.log | grep -v "Warning: Next.js ignored package-lock"

npx tsc --noEmit
```

Expected: "Set current rate" button text present (district has `compensation:manage-rate`), no server errors, `tsc --noEmit` clean.

- [ ] **Step 4: Full regression check**

```bash
npm run test
```

Expected: all tests pass (prior suite + this plan's new tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/compensation-panel.tsx "src/app/(dashboard)/projects/[id]/page.tsx"
git commit -m "feat: add compensation panel to project detail page"
```

---

## What this plan does not cover

- R&R entitlement tracking against the Second/Third Schedule, and the real 6-step R&R Award workflow from the CAG audit (spec 2.3, 6.2) — this plan is Compensation only; R&R is a distinctly-scoped follow-up plan
- Dispute/appeal workflow on an assessed amount (spec 6.2, 🟡)
- Mock bank/PFMS disbursement trail (spec 6.2, ⚪)
- Any visual design pass — same bare-Tailwind-utility level as every prior plan, per the standing 2026-08-28 decision to defer polish
