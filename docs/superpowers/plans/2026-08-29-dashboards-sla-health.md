# Dashboards & SLA Health Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute SLA health against 3 real statutory deadlines, aggregate it into a national/state dashboard with two Recharts visualizations, and seed a Tamil-Nadu-weighted demo dataset so the feature has real, non-trivial data to show.

**Architecture:** A pure `src/lib/sla.ts` computes per-project SLA status from data the caller already has (no DB access, mirrors `src/lib/compensation.ts`). A new `src/db/dashboard.ts` aggregates it across projects (mirrors every other `db/*.ts` module's `*With(db, ...)` + zero-arg-wrapper convention). The existing `/` dashboard page gets a role-scoped stats section (Recharts, client component) plus an SLA column on the existing project table — no new routes. `Session` gains `state`/`district` so the `state` role can actually be scoped. Seed data is rewritten with a backdating helper so 7 new demo projects (6 Tamil Nadu, 1 Karnataka) show real on-track/at-risk/breached outcomes today, without waiting real months.

**Tech Stack:** Existing Next.js/Drizzle/libsql/Vitest/shadcn stack, plus `recharts` (new dependency).

**Spec:** `docs/superpowers/specs/2026-08-29-dashboards-sla-health-design.md`; parent spec `docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md` (Section 6.5)

## Global Constraints

- Same as prior plans: RBAC enforced server-side, DB/auth/storage remain stubbed, single Next.js monolith.
- Only 3 SLA metrics are computed (declaration, compensation, rr-award) — the 18-month infrastructural R&R deadline has no data source anywhere in this app and is explicitly excluded, not faked.
- No new routes; the dashboard section is added to the existing `/` page.
- No change to per-project RBAC/`can()` permissions — this plan only changes what the dashboard page shows.
- `recharts` is a new dependency; every other tool in this plan already exists in the project.

---

### Task 1: SLA health computation (pure, tested)

**Files:**
- Create: `src/lib/sla.ts`
- Test: `src/lib/sla.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks — pure function over plain data shapes.
- Produces:
  - `type SLAStatus = "on-track" | "at-risk" | "breached" | "not-applicable"`
  - `interface SLAMetric { id: "declaration" | "compensation" | "rr-award"; label: string; deadlineMonths: number; startedAt: Date | null; completedAt: Date | null; status: SLAStatus; daysRemaining: number | null }`
  - `interface ComputeSLAInput { stageHistory: { toStage: string; createdAt: Date }[]; compensations: { paidAt: Date | null }[]; rrHistory: { toStage: string; createdAt: Date }[] }`
  - `function computeSLAMetrics(input: ComputeSLAInput, asOf?: Date): SLAMetric[]`
  - Used by Task 3's data layer.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/sla.test.ts
import { describe, it, expect } from "vitest";
import { computeSLAMetrics } from "./sla";

const T0 = new Date("2020-01-01T00:00:00.000Z");
function daysAfter(base: Date, n: number): Date {
  return new Date(base.getTime() + n * 24 * 60 * 60 * 1000);
}

function metricById(metrics: ReturnType<typeof computeSLAMetrics>, id: string) {
  const found = metrics.find((m) => m.id === id);
  if (!found) throw new Error(`metric not found: ${id}`);
  return found;
}

describe("computeSLAMetrics — declaration (12mo, NOTIFIED -> DECLARED)", () => {
  it("is not-applicable when NOTIFIED hasn't happened yet", () => {
    const metrics = computeSLAMetrics(
      { stageHistory: [], compensations: [], rrHistory: [] },
      T0
    );
    for (const m of metrics) {
      expect(m.status).toBe("not-applicable");
      expect(m.startedAt).toBeNull();
      expect(m.daysRemaining).toBeNull();
    }
  });

  it("is on-track when incomplete with plenty of time left", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [{ toStage: "NOTIFIED", createdAt: T0 }],
        compensations: [],
        rrHistory: [],
      },
      daysAfter(T0, 30)
    );
    const declaration = metricById(metrics, "declaration");
    expect(declaration.status).toBe("on-track");
    expect(declaration.completedAt).toBeNull();
    expect(declaration.daysRemaining).toBeGreaterThan(0);
  });

  it("is at-risk when less than 20% of the 12-month window remains", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [{ toStage: "NOTIFIED", createdAt: T0 }],
        compensations: [],
        rrHistory: [],
      },
      daysAfter(T0, 300)
    );
    expect(metricById(metrics, "declaration").status).toBe("at-risk");
  });

  it("is breached when the deadline passed with no declaration", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [{ toStage: "NOTIFIED", createdAt: T0 }],
        compensations: [],
        rrHistory: [],
      },
      daysAfter(T0, 400)
    );
    const declaration = metricById(metrics, "declaration");
    expect(declaration.status).toBe("breached");
    expect(declaration.daysRemaining).toBeLessThan(0);
  });

  it("is on-track when declared comfortably before the deadline", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [
          { toStage: "NOTIFIED", createdAt: T0 },
          { toStage: "DECLARED", createdAt: daysAfter(T0, 60) },
        ],
        compensations: [],
        rrHistory: [],
      },
      daysAfter(T0, 400)
    );
    const declaration = metricById(metrics, "declaration");
    expect(declaration.status).toBe("on-track");
    expect(declaration.completedAt).toEqual(daysAfter(T0, 60));
    expect(declaration.daysRemaining).toBeGreaterThan(0);
  });

  it("is breached when declared after the deadline had already passed", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [
          { toStage: "NOTIFIED", createdAt: T0 },
          { toStage: "DECLARED", createdAt: daysAfter(T0, 400) },
        ],
        compensations: [],
        rrHistory: [],
      },
      daysAfter(T0, 450)
    );
    const declaration = metricById(metrics, "declaration");
    expect(declaration.status).toBe("breached");
    expect(declaration.daysRemaining).toBeLessThan(0);
  });
});

describe("computeSLAMetrics — compensation (3mo, AWARDED -> all paid)", () => {
  it("is not-applicable before AWARDED, regardless of compensation records", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [],
        compensations: [{ paidAt: null }],
        rrHistory: [],
      },
      T0
    );
    expect(metricById(metrics, "compensation").status).toBe("not-applicable");
  });

  it("is on-track once every compensation record is paid before the deadline", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [{ toStage: "AWARDED", createdAt: T0 }],
        compensations: [
          { paidAt: daysAfter(T0, 20) },
          { paidAt: daysAfter(T0, 30) },
        ],
        rrHistory: [],
      },
      daysAfter(T0, 200)
    );
    const compensation = metricById(metrics, "compensation");
    expect(compensation.status).toBe("on-track");
    expect(compensation.completedAt).toEqual(daysAfter(T0, 30));
  });

  it("is breached past the deadline with zero compensation records (not vacuously complete)", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [{ toStage: "AWARDED", createdAt: T0 }],
        compensations: [],
        rrHistory: [],
      },
      daysAfter(T0, 100)
    );
    const compensation = metricById(metrics, "compensation");
    expect(compensation.status).toBe("breached");
    expect(compensation.completedAt).toBeNull();
  });
});

describe("computeSLAMetrics — rr-award (6mo, AWARDED -> RR_AWARDED)", () => {
  it("is not-applicable before AWARDED", () => {
    const metrics = computeSLAMetrics(
      { stageHistory: [], compensations: [], rrHistory: [] },
      T0
    );
    expect(metricById(metrics, "rr-award").status).toBe("not-applicable");
  });

  it("is on-track once RR_AWARDED is reached before the deadline", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [{ toStage: "AWARDED", createdAt: T0 }],
        compensations: [],
        rrHistory: [
          { toStage: "SURVEYED", createdAt: daysAfter(T0, 10) },
          { toStage: "RR_AWARDED", createdAt: daysAfter(T0, 90) },
        ],
      },
      daysAfter(T0, 200)
    );
    const rrAward = metricById(metrics, "rr-award");
    expect(rrAward.status).toBe("on-track");
    expect(rrAward.completedAt).toEqual(daysAfter(T0, 90));
  });
});

describe("computeSLAMetrics — full project integration", () => {
  it("computes all three metrics together for one realistic timeline", () => {
    const metrics = computeSLAMetrics({
      stageHistory: [
        { toStage: "NOTIFIED", createdAt: T0 },
        { toStage: "DECLARED", createdAt: daysAfter(T0, 60) },
        { toStage: "AWARDED", createdAt: daysAfter(T0, 90) },
      ],
      compensations: [{ paidAt: daysAfter(T0, 100) }],
      rrHistory: [],
    }, daysAfter(T0, 95));

    expect(metrics.map((m) => m.id)).toEqual(["declaration", "compensation", "rr-award"]);
    expect(metricById(metrics, "declaration").status).toBe("on-track");
    expect(metricById(metrics, "compensation").status).toBe("on-track");
    expect(metricById(metrics, "rr-award").status).toBe("on-track");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/sla.test.ts`
Expected: FAIL — `Cannot find module './sla'`.

- [ ] **Step 3: Write `src/lib/sla.ts`**

```ts
export type SLAStatus = "on-track" | "at-risk" | "breached" | "not-applicable";

export interface SLAMetric {
  id: "declaration" | "compensation" | "rr-award";
  label: string;
  deadlineMonths: number;
  startedAt: Date | null;
  completedAt: Date | null;
  status: SLAStatus;
  daysRemaining: number | null;
}

interface StageHistoryLike {
  toStage: string;
  createdAt: Date;
}

interface CompensationLike {
  paidAt: Date | null;
}

export interface ComputeSLAInput {
  stageHistory: StageHistoryLike[];
  compensations: CompensationLike[];
  rrHistory: StageHistoryLike[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const AVG_DAYS_PER_MONTH = 30.44;
const AT_RISK_THRESHOLD = 0.2;

function addMonths(date: Date, months: number): Date {
  return new Date(date.getTime() + months * AVG_DAYS_PER_MONTH * MS_PER_DAY);
}

function findByToStage(history: StageHistoryLike[], toStage: string): Date | null {
  const entry = history.find((h) => h.toStage === toStage);
  return entry ? entry.createdAt : null;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function buildMetric(
  id: SLAMetric["id"],
  label: string,
  deadlineMonths: number,
  startedAt: Date | null,
  completedAt: Date | null,
  asOf: Date
): SLAMetric {
  if (!startedAt) {
    return {
      id,
      label,
      deadlineMonths,
      startedAt: null,
      completedAt: null,
      status: "not-applicable",
      daysRemaining: null,
    };
  }

  const deadline = addMonths(startedAt, deadlineMonths);

  if (completedAt) {
    const daysRemaining = daysBetween(completedAt, deadline);
    const status: SLAStatus = daysRemaining < 0 ? "breached" : "on-track";
    return { id, label, deadlineMonths, startedAt, completedAt, status, daysRemaining };
  }

  const daysRemaining = daysBetween(asOf, deadline);
  if (daysRemaining < 0) {
    return { id, label, deadlineMonths, startedAt, completedAt: null, status: "breached", daysRemaining };
  }
  const totalWindowDays = deadlineMonths * AVG_DAYS_PER_MONTH;
  const status: SLAStatus =
    daysRemaining / totalWindowDays < AT_RISK_THRESHOLD ? "at-risk" : "on-track";
  return { id, label, deadlineMonths, startedAt, completedAt: null, status, daysRemaining };
}

export function computeSLAMetrics(
  input: ComputeSLAInput,
  asOf: Date = new Date()
): SLAMetric[] {
  const notifiedAt = findByToStage(input.stageHistory, "NOTIFIED");
  const declaredAt = findByToStage(input.stageHistory, "DECLARED");
  const awardedAt = findByToStage(input.stageHistory, "AWARDED");

  const paidDates = input.compensations.map((c) => c.paidAt);
  const allPaid = input.compensations.length > 0 && paidDates.every((d) => d !== null);
  const compensationCompletedAt = allPaid
    ? new Date(Math.max(...(paidDates as Date[]).map((d) => d.getTime())))
    : null;

  const rrAwardedAt = findByToStage(input.rrHistory, "RR_AWARDED");

  return [
    buildMetric(
      "declaration",
      "Section 11 → Section 19 Declaration",
      12,
      notifiedAt,
      declaredAt,
      asOf
    ),
    buildMetric("compensation", "Compensation Disbursement", 3, awardedAt, compensationCompletedAt, asOf),
    buildMetric("rr-award", "R&R Award", 6, awardedAt, rrAwardedAt, asOf),
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/sla.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sla.ts src/lib/sla.test.ts
git commit -m "feat: add SLA health computation for the 3 real statutory deadlines"
```

---

### Task 2: Session gains state/district

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Test: `src/lib/auth.test.ts`

**Interfaces:**
- Consumes: `DemoUser.state`/`DemoUser.district` (already exist on `src/db/seed-data.ts`'s `DemoUser`).
- Produces: `Session.state?: string`, `Session.district?: string` — used by Task 5's page to scope the `state` role's dashboard.

This task isn't strict red-green TDD: `parseSessionCookie` already returns `parsed as Session` verbatim with no field-stripping, so the test below passes at runtime whether or not `Session`'s type declares `state`/`district`. The actual gap it closes is the *type* — without it, `tsc` rejects any caller that tries to pass `state`/`district` into `setSession` (which Step 4 needs to do). The test is a permanent regression guard for the runtime shape, added and left green throughout.

- [ ] **Step 1: Add the regression test**

Add this test to the existing `describe("parseSessionCookie", ...)` block in `src/lib/auth.test.ts`, after the `"parses a valid session"` test:

```ts
  it("preserves optional state and district fields when present", () => {
    const raw = JSON.stringify({
      userId: "u-state-2",
      name: "Test State Official",
      role: "state",
      state: "Tamil Nadu",
    });
    expect(parseSessionCookie(raw)).toEqual({
      userId: "u-state-2",
      name: "Test State Official",
      role: "state",
      state: "Tamil Nadu",
    });
  });
```

- [ ] **Step 2: Run the test to confirm it passes**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: PASS, 5 tests — this confirms `parseSessionCookie` already preserves extra fields at runtime, before the type change below.

- [ ] **Step 3: Add `state`/`district` to `Session`**

In `src/lib/auth.ts`, change:

```ts
export interface Session {
  userId: string;
  name: string;
  role: Role;
}
```

to:

```ts
export interface Session {
  userId: string;
  name: string;
  role: Role;
  state?: string;
  district?: string;
}
```

- [ ] **Step 4: Thread `state`/`district` through the login route**

In `src/app/api/auth/login/route.ts`, change:

```ts
  await setSession({ userId: user.id, name: user.name, role: user.role });
```

to:

```ts
  await setSession({
    userId: user.id,
    name: user.name,
    role: user.role,
    state: user.state,
    district: user.district,
  });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.test.ts src/app/api/auth/login/route.ts
git commit -m "feat: thread state/district into the demo session"
```

---

### Task 3: Dashboard aggregation data layer (tested)

**Files:**
- Create: `src/db/dashboard.ts`
- Test: `src/db/dashboard.test.ts`

**Interfaces:**
- Consumes: `computeSLAMetrics` (Task 1); `listProjectsWith` (`src/db/projects.ts`), `getStageHistoryWith` (`src/db/projects.ts`), `listCompensationsForProjectWith` (`src/db/compensation.ts`), `getRRHistoryWith` (`src/db/rr.ts`), `listParcelsWith` (`src/db/parcels.ts`); `STAGES`, `type Stage` (`src/lib/workflow.ts`)
- Produces:
  - `interface ProjectSLASummary { project: typeof schema.projects.$inferSelect; metrics: SLAMetric[] }`
  - `interface PortfolioStats { projectCount: number; stageCounts: Record<Stage, number>; totalAreaHectares: number; compensationPaid: number; compensationTotal: number; slaCounts: { onTrack: number; atRisk: number; breached: number } }`
  - `interface StateBreakdownRow extends PortfolioStats { state: string }`
  - `getProjectsWithSLAWith(db, filter?: { state?: string }): Promise<ProjectSLASummary[]>`
  - `getPortfolioStatsWith(db, filter?: { state?: string }): Promise<PortfolioStats>`
  - `getStateBreakdownWith(db): Promise<StateBreakdownRow[]>`
  - Zero-arg wrappers `getProjectsWithSLA`, `getPortfolioStats`, `getStateBreakdown` — used by Task 5's page.

- [ ] **Step 1: Write the failing tests**

```ts
// src/db/dashboard.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/db/dashboard.test.ts`
Expected: FAIL — `Cannot find module './dashboard'`.

- [ ] **Step 3: Write `src/db/dashboard.ts`**

```ts
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";
import { listProjectsWith, getStageHistoryWith } from "./projects";
import { listCompensationsForProjectWith } from "./compensation";
import { getRRHistoryWith } from "./rr";
import { listParcelsWith } from "./parcels";
import { computeSLAMetrics, type SLAMetric } from "@/lib/sla";
import { STAGES, type Stage } from "@/lib/workflow";

type Db = LibSQLDatabase<typeof schema>;
type ProjectRow = typeof schema.projects.$inferSelect;

export interface ProjectSLASummary {
  project: ProjectRow;
  metrics: SLAMetric[];
}

export interface PortfolioStats {
  projectCount: number;
  stageCounts: Record<Stage, number>;
  totalAreaHectares: number;
  compensationPaid: number;
  compensationTotal: number;
  slaCounts: { onTrack: number; atRisk: number; breached: number };
}

export interface StateBreakdownRow extends PortfolioStats {
  state: string;
}

async function summarizeProject(database: Db, project: ProjectRow): Promise<ProjectSLASummary> {
  const [stageHistory, compensations, rrHistory] = await Promise.all([
    getStageHistoryWith(database, project.id),
    listCompensationsForProjectWith(database, project.id),
    getRRHistoryWith(database, project.id),
  ]);
  const metrics = computeSLAMetrics({ stageHistory, compensations, rrHistory });
  return { project, metrics };
}

function scopeProjects(projects: ProjectRow[], filter?: { state?: string }): ProjectRow[] {
  return filter?.state ? projects.filter((p) => p.state === filter.state) : projects;
}

export async function getProjectsWithSLAWith(
  database: Db,
  filter?: { state?: string }
): Promise<ProjectSLASummary[]> {
  const projects = scopeProjects(await listProjectsWith(database), filter);
  return Promise.all(projects.map((p) => summarizeProject(database, p)));
}

function emptyStats(): PortfolioStats {
  const stageCounts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  return {
    projectCount: 0,
    stageCounts,
    totalAreaHectares: 0,
    compensationPaid: 0,
    compensationTotal: 0,
    slaCounts: { onTrack: 0, atRisk: 0, breached: 0 },
  };
}

async function aggregate(database: Db, projects: ProjectRow[]): Promise<PortfolioStats> {
  const stats = emptyStats();
  stats.projectCount = projects.length;
  for (const project of projects) {
    stats.stageCounts[project.stage as Stage] += 1;
    const [parcels, compensations, rrHistory, stageHistory] = await Promise.all([
      listParcelsWith(database, project.id),
      listCompensationsForProjectWith(database, project.id),
      getRRHistoryWith(database, project.id),
      getStageHistoryWith(database, project.id),
    ]);
    stats.totalAreaHectares += parcels.reduce((sum, p) => sum + p.areaHectares, 0);
    for (const c of compensations) {
      stats.compensationTotal += c.total;
      if (c.status === "PAID") stats.compensationPaid += c.total;
    }
    const metrics = computeSLAMetrics({ stageHistory, compensations, rrHistory });
    for (const m of metrics) {
      if (m.status === "on-track") stats.slaCounts.onTrack += 1;
      else if (m.status === "at-risk") stats.slaCounts.atRisk += 1;
      else if (m.status === "breached") stats.slaCounts.breached += 1;
    }
  }
  return stats;
}

export async function getPortfolioStatsWith(
  database: Db,
  filter?: { state?: string }
): Promise<PortfolioStats> {
  const projects = scopeProjects(await listProjectsWith(database), filter);
  return aggregate(database, projects);
}

export async function getStateBreakdownWith(database: Db): Promise<StateBreakdownRow[]> {
  const projects = await listProjectsWith(database);
  const states = Array.from(new Set(projects.map((p) => p.state))).sort();
  const rows: StateBreakdownRow[] = [];
  for (const state of states) {
    const stats = await aggregate(
      database,
      projects.filter((p) => p.state === state)
    );
    rows.push({ state, ...stats });
  }
  return rows;
}

export const getProjectsWithSLA = (filter?: { state?: string }) =>
  getProjectsWithSLAWith(defaultDb, filter);
export const getPortfolioStats = (filter?: { state?: string }) =>
  getPortfolioStatsWith(defaultDb, filter);
export const getStateBreakdown = () => getStateBreakdownWith(defaultDb);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/db/dashboard.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/db/dashboard.ts src/db/dashboard.test.ts
git commit -m "feat: add dashboard aggregation and SLA rollup data layer"
```

---

### Task 4: Status-color hex values, SLA tone mapping, and recharts

**Files:**
- Modify: `src/lib/status-colors.ts`
- Modify: `src/lib/status-colors.test.ts`
- Modify: `package.json` (via `npm install`)

**Interfaces:**
- Consumes: `SLAStatus` (Task 1, used only as a plain string parameter type — no import needed since `slaStatusTone` takes `string`, matching the existing `stageTone`/`compensationTone` pattern of not importing the domain type).
- Produces: `toneHex(tone: StatusTone): string`, `slaStatusTone(status: string): StatusTone` — used by Task 5's chart component and dashboard page.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/status-colors.test.ts`, after the existing `describe("compensationTone", ...)` block:

```ts
describe("toneHex", () => {
  it("returns a distinct hex color for each tone", () => {
    const colors = new Set([
      toneHex("pending"),
      toneHex("success"),
      toneHex("danger"),
      toneHex("info"),
    ]);
    expect(colors.size).toBe(4);
    for (const c of colors) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("slaStatusTone", () => {
  it("maps on-track/at-risk/breached to success/pending/danger", () => {
    expect(slaStatusTone("on-track")).toBe("success");
    expect(slaStatusTone("at-risk")).toBe("pending");
    expect(slaStatusTone("breached")).toBe("danger");
  });

  it("defaults unknown statuses to pending", () => {
    expect(slaStatusTone("not-applicable")).toBe("pending");
  });
});
```

Update the import at the top of the file:

```ts
import { toneBadgeClass, stageTone, compensationTone, toneHex, slaStatusTone } from "./status-colors";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/status-colors.test.ts`
Expected: FAIL — `toneHex`/`slaStatusTone` are not exported.

- [ ] **Step 3: Add `toneHex` and `slaStatusTone` to `src/lib/status-colors.ts`**

Append to the end of the file:

```ts
const TONE_HEX: Record<StatusTone, string> = {
  pending: "#d97706",
  success: "#16a34a",
  danger: "#dc2626",
  info: "#2563eb",
};

export function toneHex(tone: StatusTone): string {
  return TONE_HEX[tone];
}

const SLA_STATUS_TONES: Record<string, StatusTone> = {
  "on-track": "success",
  "at-risk": "pending",
  breached: "danger",
};

export function slaStatusTone(status: string): StatusTone {
  return SLA_STATUS_TONES[status] ?? "pending";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/status-colors.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Install recharts**

Run: `npm install recharts`
Expected: completes without error; `recharts` appears under `dependencies` in `package.json`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/status-colors.ts src/lib/status-colors.test.ts package.json package-lock.json
git commit -m "feat: add SLA/chart color mapping and recharts dependency"
```

---

### Task 5: Dashboard stats UI and SLA badges

**Files:**
- Create: `src/components/dashboard-stats.tsx`
- Modify: `src/app/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `getProjectsWithSLA`, `getPortfolioStats`, `getStateBreakdown` (Task 3); `toneBadgeClass`, `stageTone`, `slaStatusTone`, `toneHex` (Task 4); `type SLAMetric` (Task 1); `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Badge`, `Table*` (existing shadcn components)
- Produces: a stats section (stat tiles + 2 charts + optional state table) above the existing project list, plus an SLA badge column on that list. No exports consumed by later tasks — this is the last UI task.

No automated test — same rationale as every other chart/panel component in this codebase (`compensation-panel.tsx`, `rr-panel.tsx`): verified manually in Step 3.

- [ ] **Step 1: Write `src/components/dashboard-stats.tsx`**

```tsx
"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { slaStatusTone, stageTone, toneHex } from "@/lib/status-colors";

interface PortfolioStatsProps {
  projectCount: number;
  stageCounts: Record<string, number>;
  totalAreaHectares: number;
  compensationPaid: number;
  compensationTotal: number;
  slaCounts: { onTrack: number; atRisk: number; breached: number };
}

interface StateBreakdownRowProps extends PortfolioStatsProps {
  state: string;
}

function formatLakh(amount: number): string {
  return `₹${(amount / 100000).toFixed(1)}L`;
}

export function DashboardStats({
  stats,
  stateBreakdown,
}: {
  stats: PortfolioStatsProps;
  stateBreakdown?: StateBreakdownRowProps[];
}) {
  const stageData = Object.entries(stats.stageCounts)
    .filter(([, count]) => count > 0)
    .map(([stage, count]) => ({ stage, count, fill: toneHex(stageTone(stage)) }));

  const slaData = [
    { name: "On track", value: stats.slaCounts.onTrack, fill: toneHex(slaStatusTone("on-track")) },
    { name: "At risk", value: stats.slaCounts.atRisk, fill: toneHex(slaStatusTone("at-risk")) },
    { name: "Breached", value: stats.slaCounts.breached, fill: toneHex(slaStatusTone("breached")) },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Projects</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.projectCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Area under acquisition
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stats.totalAreaHectares.toFixed(1)} ha
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Compensation paid
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatLakh(stats.compensationPaid)} / {formatLakh(stats.compensationTotal)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              SLA breaches
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.slaCounts.breached}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Projects by stage</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {stageData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} layout="vertical" margin={{ left: 24 }}>
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="stage" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count">
                    {stageData.map((entry) => (
                      <Cell key={entry.stage} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">SLA health</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {slaData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No SLA-tracked milestones yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={slaData} dataKey="value" nameKey="name" outerRadius={80} label>
                    {slaData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {stateBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">State-wise breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Area (ha)</TableHead>
                  <TableHead>Compensation paid</TableHead>
                  <TableHead>SLA breaches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stateBreakdown.map((row) => (
                  <TableRow key={row.state}>
                    <TableCell className="font-medium">{row.state}</TableCell>
                    <TableCell>{row.projectCount}</TableCell>
                    <TableCell>{row.totalAreaHectares.toFixed(1)}</TableCell>
                    <TableCell>{formatLakh(row.compensationPaid)}</TableCell>
                    <TableCell>{row.slaCounts.breached}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/(dashboard)/page.tsx`**

Replace the full file with:

```tsx
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getProjectsWithSLA, getPortfolioStats, getStateBreakdown } from "@/db/dashboard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { stageTone, toneBadgeClass, slaStatusTone } from "@/lib/status-colors";
import { DashboardStats } from "@/components/dashboard-stats";
import type { SLAMetric } from "@/lib/sla";

const SLA_BADGE_LABELS: Record<SLAMetric["id"], string> = {
  declaration: "Declaration",
  compensation: "Compensation",
  "rr-award": "R&R Award",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const stateFilter = session.role === "state" ? session.state : undefined;
  const showPortfolioStats = session.role === "central" || session.role === "state";

  const summaries = await getProjectsWithSLA(stateFilter ? { state: stateFilter } : undefined);
  const stats = showPortfolioStats
    ? await getPortfolioStats(stateFilter ? { state: stateFilter } : undefined)
    : null;
  const stateBreakdown = session.role === "central" ? await getStateBreakdown() : undefined;

  return (
    <div className="space-y-6">
      {stats && <DashboardStats stats={stats} stateBreakdown={stateBreakdown} />}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Projects</h2>
        {summaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        ) : (
          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>District, State</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map(({ project, metrics }) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium hover:underline"
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.district}, {project.state}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={toneBadgeClass(stageTone(project.stage))}>
                        {project.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {metrics
                          .filter((m) => m.status !== "not-applicable")
                          .map((m) => (
                            <Badge
                              key={m.id}
                              variant="outline"
                              className={toneBadgeClass(slaStatusTone(m.status))}
                            >
                              {SLA_BADGE_LABELS[m.id]}
                            </Badge>
                          ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manually verify**

```bash
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
npm run dev > /tmp/nextdev-dash.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'

curl -s -c /tmp/c-central.txt -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"userId":"u-central-1"}' > /dev/null
curl -s -b /tmp/c-central.txt http://localhost:3000/ -o /tmp/dash-central.html
grep -o "State-wise breakdown" /tmp/dash-central.html
grep -o "Projects by stage" /tmp/dash-central.html

curl -s -c /tmp/c-district.txt -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"userId":"u-district-1"}' > /dev/null
curl -s -b /tmp/c-district.txt http://localhost:3000/ -o /tmp/dash-district.html
grep -c "State-wise breakdown" /tmp/dash-district.html

grep -aiE "error" /tmp/nextdev-dash.log | grep -v "Warning: Next.js ignored package-lock"
npx tsc --noEmit
```

Expected: central role's page contains both "State-wise breakdown" and "Projects by stage"; district role's page does not contain "State-wise breakdown" (`grep -c` returns `0`); no server errors; `tsc` clean. (Only the existing single Koraput/DRAFT project exists until Task 6 seeds more — this step is checking the page renders and role-scoping works, not the data richness, which Task 6 verifies.)

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard-stats.tsx "src/app/(dashboard)/page.tsx"
git commit -m "feat: add role-scoped dashboard stats, charts, and SLA badges"
```

---

### Task 6: Tamil-Nadu-weighted seed data with backdated SLA scenarios

**Files:**
- Modify: `src/db/seed-data.ts`
- Modify: `src/db/seed.ts`

**Interfaces:**
- Consumes: `transitionProject`, `type Action`, `type Role`, `type Stage` (`src/lib/workflow.ts`); `transitionRR`, `type RRAction`, `type RRStage` (`src/lib/rr-workflow.ts`); `calculateCompensation` (`src/lib/compensation.ts`); `createParcel` (`src/db/parcels.ts`); `setCompensationRate` (`src/db/compensation.ts`); `getProject` (`src/db/projects.ts`); `projects`, `stageHistory`, `rrStageHistory`, `compensations` tables (`src/db/schema.ts`)
- Produces: 8 seeded demo projects (1 existing + 7 new) with realistic, deterministic SLA outcomes. No exports — this is a script, not a module other code imports.

No automated test — this is a data-seeding script, verified by running it and inspecting the result (Step 4).

- [ ] **Step 1: Add the Tamil Nadu state demo user**

In `src/db/seed-data.ts`, add this entry to `DEMO_USERS` (after the existing `u-state-1` entry):

```ts
  {
    id: "u-state-2",
    name: "Lakshmi Narayanan (State Govt, Tamil Nadu)",
    role: "state",
    state: "Tamil Nadu",
  },
```

- [ ] **Step 2: Add seed helpers to `src/db/seed.ts`**

At the top of `src/db/seed.ts`, extend the imports:

```ts
import { db } from "./client";
import { eq } from "drizzle-orm";
import { users, projects, stageHistory, rrStageHistory, compensations } from "./schema";
import { DEMO_USERS } from "./seed-data";
import { saveFile } from "@/lib/storage";
import { createDocument } from "./documents";
import { setProjectGeometry } from "./projects";
import { createParcel } from "./parcels";
import { setCompensationRate } from "./compensation";
import { getProject } from "./projects";
import { transitionProject, type Action, type Role, type Stage } from "@/lib/workflow";
import { transitionRR, type RRAction, type RRStage } from "@/lib/rr-workflow";
import { calculateCompensation } from "@/lib/compensation";
import type { Geometry, PolygonGeometry } from "@/lib/geo";
import type { ParcelStatus } from "@/lib/parcel-status";
```

After the imports, add the seed-only helpers (these mirror `applyProjectTransitionWith`/`applyRRTransitionWith` but accept an explicit historical timestamp instead of always using `new Date()`):

```ts
const SEED_ACTOR_IDS: Record<Role, string> = {
  agency: "u-agency-1",
  district: "u-district-1",
  state: "u-state-1",
  central: "u-central-1",
  field: "u-field-1",
};

function monthsAgo(n: number): Date {
  return new Date(Date.now() - Math.round(n * 30) * 24 * 60 * 60 * 1000);
}

async function seedProjectTransition(
  projectId: string,
  action: Action,
  actorRole: Role,
  occurredAt: Date
): Promise<Stage> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);
  const nextStage = transitionProject(project.stage as Stage, action, actorRole);
  await db
    .update(projects)
    .set({ stage: nextStage, updatedAt: occurredAt })
    .where(eq(projects.id, projectId));
  await db.insert(stageHistory).values({
    id: crypto.randomUUID(),
    projectId,
    fromStage: project.stage,
    toStage: nextStage,
    action,
    actorId: SEED_ACTOR_IDS[actorRole],
    actorRole,
    createdAt: occurredAt,
  });
  return nextStage;
}

async function seedRRTransition(
  projectId: string,
  action: RRAction,
  actorRole: Role,
  occurredAt: Date
): Promise<RRStage> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);
  const currentStage = (project.rrStage as RRStage | null) ?? null;
  const nextStage = transitionRR(currentStage, action, actorRole);
  await db.update(projects).set({ rrStage: nextStage }).where(eq(projects.id, projectId));
  await db.insert(rrStageHistory).values({
    id: crypto.randomUUID(),
    projectId,
    fromStage: currentStage,
    toStage: nextStage,
    action,
    actorId: SEED_ACTOR_IDS[actorRole],
    actorRole,
    note: null,
    createdAt: occurredAt,
  });
  return nextStage;
}

async function seedCompensation(
  parcelId: string,
  projectId: string,
  areaHectares: number,
  rate: { ratePerHectare: number; multiplier: number },
  notifiedAt: Date,
  awardedAt: Date,
  assetsValue: number,
  paidAt: Date | null
): Promise<void> {
  const breakdown = calculateCompensation({
    areaHectares,
    ratePerHectare: rate.ratePerHectare,
    multiplier: rate.multiplier,
    assetsValue,
    sIANotificationDate: notifiedAt,
    awardDate: awardedAt,
  });
  await db.insert(compensations).values({
    id: crypto.randomUUID(),
    parcelId,
    projectId,
    ratePerHectare: rate.ratePerHectare,
    multiplier: rate.multiplier,
    assetsValue: breakdown.assetsValue,
    marketValue: breakdown.marketValue,
    multipliedMarketValue: breakdown.multipliedMarketValue,
    solatium: breakdown.solatium,
    interest: breakdown.interest,
    total: breakdown.total,
    status: paidAt ? "PAID" : "ASSESSED",
    assessedBy: SEED_ACTOR_IDS.district,
    assessedAt: awardedAt,
    paidAt,
  });
}

interface SeedProjectInput {
  id: string;
  name: string;
  purpose: string;
  state: string;
  district: string;
  createdBy: string;
  createdAt: Date;
  geometry: Geometry;
  parcels: Array<{ village: string; areaHectares: number; status: ParcelStatus; geometry: PolygonGeometry }>;
  rate: { ratePerHectare: number; multiplier: number };
}

async function createSeedProject(input: SeedProjectInput): Promise<string[]> {
  await db.insert(projects).values({
    id: input.id,
    name: input.name,
    purpose: input.purpose,
    state: input.state,
    district: input.district,
    stage: "DRAFT",
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  });
  await db.insert(stageHistory).values({
    id: crypto.randomUUID(),
    projectId: input.id,
    fromStage: null,
    toStage: "DRAFT",
    action: "CREATE",
    actorId: input.createdBy,
    actorRole: "agency",
    createdAt: input.createdAt,
  });
  await setProjectGeometry(input.id, input.geometry);
  await setCompensationRate({
    state: input.state,
    district: input.district,
    ratePerHectare: input.rate.ratePerHectare,
    multiplier: input.rate.multiplier,
    setBy: "u-district-1",
  });
  const parcelIds: string[] = [];
  for (const p of input.parcels) {
    parcelIds.push(await createParcel({ projectId: input.id, ...p }));
  }
  return parcelIds;
}
```

- [ ] **Step 3: Add the 7 new projects to `main()`**

Immediately before the closing `console.log("Seed complete: 5 demo users, 1 demo project.");` line in `main()`, insert:

```ts
  // --- Tamil Nadu: Chennai-Salem Green Corridor Expressway (Krishnagiri) ---
  // Breached: notified 14.5 months ago, never declared (12mo deadline).
  {
    const id = "p-tn-chennai-salem";
    await createSeedProject({
      id,
      name: "Chennai–Salem Green Corridor Expressway",
      purpose: "Access-controlled greenfield expressway corridor, Krishnagiri stretch",
      state: "Tamil Nadu",
      district: "Krishnagiri",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(15),
      geometry: { type: "LineString", coordinates: [[78.20, 12.52], [78.24, 12.56]] },
      parcels: [
        { village: "Bargur", areaHectares: 3.4, status: "NOTIFIED", geometry: { type: "Polygon", coordinates: [[[78.205, 12.525], [78.205, 12.53], [78.21, 12.53], [78.21, 12.525], [78.205, 12.525]]] } },
        { village: "Uthangarai", areaHectares: 2.1, status: "NOTIFIED", geometry: { type: "Polygon", coordinates: [[[78.225, 12.545], [78.225, 12.55], [78.23, 12.55], [78.23, 12.545], [78.225, 12.545]]] } },
      ],
      rate: { ratePerHectare: 1_200_000, multiplier: 2.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(15));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(14.7));
    await seedProjectTransition(id, "COMPLETE", "district", monthsAgo(14.5));
  }

  // --- Tamil Nadu: Chennai Metro Phase 2 - Poonamallee Extension ---
  // At-risk: awarded 2.5 months ago, only 1 of 2 parcels paid (3mo deadline).
  {
    const id = "p-tn-chennai-metro";
    const notifiedAt = monthsAgo(5.6);
    const awardedAt = monthsAgo(2.5);
    const rate = { ratePerHectare: 8_000_000, multiplier: 1.0 };
    const parcelIds = await createSeedProject({
      id,
      name: "Chennai Metro Phase 2 – Poonamallee Extension",
      purpose: "Elevated metro corridor extension, Poonamallee High Road",
      state: "Tamil Nadu",
      district: "Chennai",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(6),
      geometry: { type: "LineString", coordinates: [[80.08, 13.03], [80.13, 13.07]] },
      parcels: [
        { village: "Poonamallee", areaHectares: 0.6, status: "ACQUIRED", geometry: { type: "Polygon", coordinates: [[[80.09, 13.04], [80.09, 13.045], [80.095, 13.045], [80.095, 13.04], [80.09, 13.04]]] } },
        { village: "Thirumazhisai", areaHectares: 0.4, status: "ACQUIRED", geometry: { type: "Polygon", coordinates: [[[80.11, 13.055], [80.11, 13.06], [80.115, 13.06], [80.115, 13.055], [80.11, 13.055]]] } },
      ],
      rate,
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(6));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(5.8));
    await seedProjectTransition(id, "COMPLETE", "district", notifiedAt);
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(5.4));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(5.2));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(5.0));
    await seedProjectTransition(id, "PASS_AWARD", "district", awardedAt);
    await seedCompensation(parcelIds[0], id, 0.6, rate, notifiedAt, awardedAt, 50_000, monthsAgo(2.0));
    await seedCompensation(parcelIds[1], id, 0.4, rate, notifiedAt, awardedAt, 50_000, null);
  }

  // --- Tamil Nadu: Cauvery-Vaigai-Gundar Link Canal (Sivaganga Reach) ---
  // At-risk R&R (awarded 5mo ago, 6mo deadline, only reached SUBMITTED_TO_COLLECTOR).
  // Compensation on-track (fully paid within 0.2mo of award).
  {
    const id = "p-tn-cvg-canal";
    const notifiedAt = monthsAgo(9.6);
    const awardedAt = monthsAgo(5.0);
    const rate = { ratePerHectare: 900_000, multiplier: 2.5 };
    const parcelIds = await createSeedProject({
      id,
      name: "Cauvery–Vaigai–Gundar Link Canal (Sivaganga Reach)",
      purpose: "Inter-basin link canal, Sivaganga command area",
      state: "Tamil Nadu",
      district: "Sivaganga",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(10),
      geometry: { type: "Polygon", coordinates: [[[78.47, 9.84], [78.47, 9.86], [78.50, 9.86], [78.50, 9.84], [78.47, 9.84]]] },
      parcels: [
        { village: "Manamadurai", areaHectares: 4.2, status: "ACQUIRED", geometry: { type: "Polygon", coordinates: [[[78.475, 9.845], [78.475, 9.85], [78.48, 9.85], [78.48, 9.845], [78.475, 9.845]]] } },
        { village: "Ilayangudi", areaHectares: 3.1, status: "ACQUIRED", geometry: { type: "Polygon", coordinates: [[[78.49, 9.855], [78.49, 9.858], [78.495, 9.858], [78.495, 9.855], [78.49, 9.855]]] } },
      ],
      rate,
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(10));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(9.8));
    await seedProjectTransition(id, "COMPLETE", "district", notifiedAt);
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(9.4));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(9.2));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(9.0));
    await seedProjectTransition(id, "PASS_AWARD", "district", awardedAt);
    await seedCompensation(parcelIds[0], id, 4.2, rate, notifiedAt, awardedAt, 100_000, monthsAgo(4.8));
    await seedCompensation(parcelIds[1], id, 3.1, rate, notifiedAt, awardedAt, 100_000, monthsAgo(4.8));
    await seedProjectTransition(id, "START_RR", "district", monthsAgo(4.9));
    await seedRRTransition(id, "COMPLETE_SURVEY", "district", monthsAgo(4.5));
    await seedRRTransition(id, "COMPLETE_SCHEME", "district", monthsAgo(3.5));
    await seedRRTransition(id, "COMPLETE_HEARING", "district", monthsAgo(2.5));
    await seedRRTransition(id, "SUBMIT_TO_COLLECTOR", "district", monthsAgo(1.5));
  }

  // --- Tamil Nadu: Ennore-Kattupalli Port Connectivity Corridor ---
  // Full success story: every deadline met with margin, all the way to RR_COMPLETE.
  {
    const id = "p-tn-ennore-kattupalli";
    const notifiedAt = monthsAgo(7.8);
    const awardedAt = monthsAgo(6.5);
    const rate = { ratePerHectare: 3_500_000, multiplier: 1.5 };
    const parcelIds = await createSeedProject({
      id,
      name: "Ennore–Kattupalli Port Connectivity Corridor",
      purpose: "Port-linked freight corridor, Ennore to Kattupalli",
      state: "Tamil Nadu",
      district: "Thiruvallur",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(8),
      geometry: { type: "LineString", coordinates: [[80.30, 13.23], [80.35, 13.28]] },
      parcels: [
        { village: "Ennore", areaHectares: 1.8, status: "POSSESSED", geometry: { type: "Polygon", coordinates: [[[80.31, 13.24], [80.31, 13.245], [80.315, 13.245], [80.315, 13.24], [80.31, 13.24]]] } },
        { village: "Kattupalli", areaHectares: 2.4, status: "POSSESSED", geometry: { type: "Polygon", coordinates: [[[80.335, 13.265], [80.335, 13.27], [80.34, 13.27], [80.34, 13.265], [80.335, 13.265]]] } },
      ],
      rate,
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(8));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(7.9));
    await seedProjectTransition(id, "COMPLETE", "district", notifiedAt);
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(7.6));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(7.4));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(7.2));
    await seedProjectTransition(id, "PASS_AWARD", "district", awardedAt);
    await seedCompensation(parcelIds[0], id, 1.8, rate, notifiedAt, awardedAt, 80_000, monthsAgo(6.3));
    await seedCompensation(parcelIds[1], id, 2.4, rate, notifiedAt, awardedAt, 80_000, monthsAgo(6.3));
    await seedProjectTransition(id, "START_RR", "district", monthsAgo(6.4));
    await seedRRTransition(id, "COMPLETE_SURVEY", "district", monthsAgo(6.2));
    await seedRRTransition(id, "COMPLETE_SCHEME", "district", monthsAgo(5.8));
    await seedRRTransition(id, "COMPLETE_HEARING", "district", monthsAgo(5.4));
    await seedRRTransition(id, "SUBMIT_TO_COLLECTOR", "district", monthsAgo(5.0));
    await seedRRTransition(id, "APPROVE_RR_SCHEME", "state", monthsAgo(4.5));
    await seedRRTransition(id, "PASS_RR_AWARD", "district", monthsAgo(4.0));
    await seedProjectTransition(id, "COMPLETE_RR", "district", monthsAgo(3.5));
    await seedProjectTransition(id, "COMPLETE_INFRASTRUCTURE", "district", monthsAgo(1.0));
  }
```

Continue adding the remaining 3 projects:

```ts
  // --- Tamil Nadu: Coimbatore-Sathyamangalam NH Bypass ---
  // Too early: created 1 month ago, only reached SIA.
  {
    const id = "p-tn-coimbatore-bypass";
    await createSeedProject({
      id,
      name: "Coimbatore–Sathyamangalam NH Bypass",
      purpose: "National highway bypass corridor around Coimbatore",
      state: "Tamil Nadu",
      district: "Coimbatore",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(1.0),
      geometry: { type: "LineString", coordinates: [[76.96, 11.02], [77.05, 11.10]] },
      parcels: [
        { village: "Annur", areaHectares: 1.6, status: "NOTIFIED", geometry: { type: "Polygon", coordinates: [[[76.98, 11.04], [76.98, 11.045], [76.985, 11.045], [76.985, 11.04], [76.98, 11.04]]] } },
      ],
      rate: { ratePerHectare: 2_000_000, multiplier: 2.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(1.0));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(0.9));
  }

  // --- Tamil Nadu: SIPCOT Industrial Corridor Expansion (Perambalur) ---
  // Breached: awarded 4 months ago, compensation assessed but never paid (3mo deadline).
  {
    const id = "p-tn-sipcot-perambalur";
    const notifiedAt = monthsAgo(6.1);
    const awardedAt = monthsAgo(4.0);
    const rate = { ratePerHectare: 1_000_000, multiplier: 2.0 };
    const parcelIds = await createSeedProject({
      id,
      name: "SIPCOT Industrial Corridor Expansion – Perambalur",
      purpose: "Industrial corridor land pooling, SIPCOT Perambalur phase 2",
      state: "Tamil Nadu",
      district: "Perambalur",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(6.5),
      geometry: { type: "Polygon", coordinates: [[[78.87, 11.22], [78.87, 11.24], [78.90, 11.24], [78.90, 11.22], [78.87, 11.22]]] },
      parcels: [
        { village: "Perambalur Town", areaHectares: 5.0, status: "ACQUIRED", geometry: { type: "Polygon", coordinates: [[[78.875, 11.225], [78.875, 11.23], [78.88, 11.23], [78.88, 11.225], [78.875, 11.225]]] } },
        { village: "Veppanthattai", areaHectares: 3.2, status: "ACQUIRED", geometry: { type: "Polygon", coordinates: [[[78.89, 11.235], [78.89, 11.238], [78.895, 11.238], [78.895, 11.235], [78.89, 11.235]]] } },
      ],
      rate,
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(6.5));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(6.3));
    await seedProjectTransition(id, "COMPLETE", "district", notifiedAt);
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(5.9));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(5.7));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(5.5));
    await seedProjectTransition(id, "PASS_AWARD", "district", awardedAt);
    await seedCompensation(parcelIds[0], id, 5.0, rate, notifiedAt, awardedAt, 120_000, null);
    await seedCompensation(parcelIds[1], id, 3.2, rate, notifiedAt, awardedAt, 120_000, null);
  }

  // --- Karnataka: Bengaluru Peripheral Ring Road Corridor ---
  // On-track, early: notified 3 months ago, 12mo deadline.
  {
    const id = "p-ka-bengaluru-prr";
    await createSeedProject({
      id,
      name: "Bengaluru Peripheral Ring Road Corridor",
      purpose: "Peripheral ring road land acquisition, northern stretch",
      state: "Karnataka",
      district: "Bengaluru Urban",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(3.2),
      geometry: { type: "LineString", coordinates: [[77.55, 12.90], [77.65, 13.00]] },
      parcels: [
        { village: "Hoskote", areaHectares: 2.8, status: "NOTIFIED", geometry: { type: "Polygon", coordinates: [[[77.57, 12.92], [77.57, 12.925], [77.575, 12.925], [77.575, 12.92], [77.57, 12.92]]] } },
        { village: "Nelamangala", areaHectares: 1.9, status: "NOTIFIED", geometry: { type: "Polygon", coordinates: [[[77.62, 12.97], [77.62, 12.975], [77.625, 12.975], [77.625, 12.97], [77.62, 12.97]]] } },
      ],
      rate: { ratePerHectare: 6_000_000, multiplier: 1.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(3.2));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(3.1));
    await seedProjectTransition(id, "COMPLETE", "district", monthsAgo(3.0));
  }

  console.log("Seed complete: 6 demo users, 8 demo projects.");
```

Delete the old `console.log("Seed complete: 5 demo users, 1 demo project.");` line that this replaces.

- [ ] **Step 4: Reset the local database and reseed**

```bash
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
rm -f local.db
npm run db:push
npm run db:seed
```

Expected: `db:push` completes without error; `db:seed` prints `Seed complete: 6 demo users, 8 demo projects.` with no thrown errors (a thrown error from `transitionProject`/`transitionRR` here means an action/stage sequence for one of the 8 projects is wrong — check the offending project's step order against the transition tables in `src/lib/workflow.ts`/`src/lib/rr-workflow.ts`).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/db/seed-data.ts src/db/seed.ts
git commit -m "feat: seed Tamil-Nadu-weighted demo projects with backdated SLA scenarios"
```

---

### Task 7: Full regression and demo verification

**Files:** none — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (prior suite + this plan's new tests: 12 in `sla.test.ts`, 1 new in `auth.test.ts`, 5 in `dashboard.test.ts`, 2 new in `status-colors.test.ts`).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Verify the seeded SLA outcomes end-to-end**

```bash
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
npm run dev > /tmp/nextdev-final.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'

curl -s -c /tmp/c-central.txt -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"userId":"u-central-1"}' > /dev/null
curl -s -b /tmp/c-central.txt http://localhost:3000/ -o /tmp/dash-central.html
grep -o "Tamil Nadu" /tmp/dash-central.html | head -1
grep -o "Karnataka" /tmp/dash-central.html | head -1
grep -o "Odisha" /tmp/dash-central.html | head -1

curl -s -c /tmp/c-tn.txt -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"userId":"u-state-2"}' > /dev/null
curl -s -b /tmp/c-tn.txt http://localhost:3000/ -o /tmp/dash-tn.html
grep -c "Odisha" /tmp/dash-tn.html
grep -o "Chennai\xe2\x80\x93Salem" /tmp/dash-tn.html

grep -aiE "error" /tmp/nextdev-final.log | grep -v "Warning: Next.js ignored package-lock"
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
```

Expected: central role's dashboard shows Tamil Nadu, Karnataka, and Odisha (state breakdown table); the Tamil Nadu state official (`u-state-2`) sees zero occurrences of "Odisha" (properly scoped to their own state) and does see the Chennai-Salem project; no server errors.

- [ ] **Step 4: Stop the dev server left running from manual verification**

```bash
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
```

---

## What this plan does not cover

- The 18-month infrastructural R&R deadline (no data source anywhere in the app)
- Customizable MIS report builder, cross-state comparison view (both 🟡 P1)
- Escalation matrix / auto-notify on SLA breach (⚪ P2)
- Any change to per-project RBAC/`can()` permissions
