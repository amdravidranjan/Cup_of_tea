# Public Transparency Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the platform a no-login public landing page at `/` (national stats, public-eligible project list, recent notices) and a public per-project detail page at `/projects/[id]`, while moving the existing internal role dashboard to `/app`.

**Architecture:** A pure boundary rule (`isPublicStage`) plus a new `src/db/public.ts` data module (mirrors `src/db/dashboard.ts`'s conventions, reuses its aggregation logic) drive two new server-rendered pages under a new `(public)` route group. The existing `(dashboard)` route group is renamed to a real `app/` segment — a directory move, not a rewrite.

**Tech Stack:** Existing Next.js/Drizzle/libsql/Vitest/shadcn stack. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-29-public-transparency-portal-design.md`; parent spec `docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md` (Section 6.8)

## Global Constraints

- A project is public once `STAGES.indexOf(stage) >= STAGES.indexOf("NOTIFIED")` — no other visibility rule.
- No landowner/family names, no per-parcel compensation amounts, no documents on any public page.
- `getPublicProjectDetailWith` returns `null` for both "doesn't exist" and "not yet public" — callers must not distinguish the two (avoids confirming a draft project's existence).
- No new dependencies, no new DB tables — notices are derived from `stage_history` at read time.

---

### Task 1: Public data layer (`src/db/public.ts`)

**Files:**
- Modify: `src/db/dashboard.ts` (export the existing private `aggregate` helper)
- Create: `src/db/public.ts`
- Test: `src/db/public.test.ts`

**Interfaces:**
- Consumes: `STAGES`, `type Stage` (`src/lib/workflow.ts`); `listProjectsWith`, `getStageHistoryWith` (`src/db/projects.ts`); `listParcelsWith`, `type Parcel` (`src/db/parcels.ts`); `listCompensationsForProjectWith` (`src/db/compensation.ts`); `computeSLAMetrics`, `type SLAMetric` (`src/lib/sla.ts`); `parseStoredGeometry`, `computeParcelsWithImpact` (`src/lib/geo.ts`); `aggregatePortfolioStatsWith`, `type PortfolioStats` (`src/db/dashboard.ts`, this task).
- Produces:
  - `function isPublicStage(stage: Stage): boolean`
  - `interface PublicProjectSummary { id: string; name: string; purpose: string; state: string; district: string; stage: Stage; metrics: SLAMetric[] }`
  - `interface PublicNotice { id: string; projectId: string; projectName: string; state: string; district: string; stage: Stage; label: string; occurredAt: Date }`
  - `interface PublicProjectDetail { project: PublicProjectSummary; totalAreaHectares: number; villageCount: number; parcelCount: number; compensationPaid: number; compensationTotal: number; alignment: ReturnType<typeof parseStoredGeometry>; parcels: (Parcel & { withinImpact: boolean })[]; notices: PublicNotice[] }`
  - `listPublicProjectsWith(db): Promise<PublicProjectSummary[]>`
  - `getPublicProjectDetailWith(db, id): Promise<PublicProjectDetail | null>`
  - `getPublicPortfolioStatsWith(db): Promise<PortfolioStats>`
  - `listPublicNoticesWith(db, limit?): Promise<PublicNotice[]>`
  - Zero-arg wrappers `listPublicProjects`, `getPublicProjectDetail`, `getPublicPortfolioStats`, `listPublicNotices` — used by Task 4 and Task 5's pages.

- [ ] **Step 1: Export `aggregate` from `dashboard.ts`**

In `src/db/dashboard.ts`, change `async function aggregate(` to `export async function aggregatePortfolioStatsWith(` and update its two call sites in the same file (`getPortfolioStatsWith` and `getStateBreakdownWith`) to use the new name.

Run: `npx vitest run src/db/dashboard.test.ts`
Expected: PASS, 5 tests (behavior unchanged, only the internal name changed).

- [ ] **Step 2: Write the failing tests**

```ts
// src/db/public.test.ts
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
    expect(notices.map((n) => n.projectId)).toEqual(["p-awarded", "p-notified"]);
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/db/public.test.ts`
Expected: FAIL — `Cannot find module './public'`.

- [ ] **Step 4: Write `src/db/public.ts`**

```ts
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";
import { listProjectsWith, getStageHistoryWith } from "./projects";
import { listParcelsWith, type Parcel } from "./parcels";
import { listCompensationsForProjectWith } from "./compensation";
import { getRRHistoryWith } from "./rr";
import { computeSLAMetrics, type SLAMetric } from "@/lib/sla";
import { STAGES, type Stage } from "@/lib/workflow";
import { parseStoredGeometry, computeParcelsWithImpact, type Geometry } from "@/lib/geo";
import { aggregatePortfolioStatsWith, type PortfolioStats } from "./dashboard";

type Db = LibSQLDatabase<typeof schema>;
type ProjectRow = typeof schema.projects.$inferSelect;

export interface PublicProjectSummary {
  id: string;
  name: string;
  purpose: string;
  state: string;
  district: string;
  stage: Stage;
  metrics: SLAMetric[];
}

export interface PublicNotice {
  id: string;
  projectId: string;
  projectName: string;
  state: string;
  district: string;
  stage: Stage;
  label: string;
  occurredAt: Date;
}

export interface PublicProjectDetail {
  project: PublicProjectSummary;
  totalAreaHectares: number;
  villageCount: number;
  parcelCount: number;
  compensationPaid: number;
  compensationTotal: number;
  alignment: Geometry | null;
  parcels: (Parcel & { withinImpact: boolean })[];
  notices: PublicNotice[];
}

const NOTICE_LABELS: Partial<Record<Stage, string>> = {
  NOTIFIED: "Section 11 Preliminary Notification issued",
  DECLARED: "Section 19 Final Declaration published",
  AWARDED: "Compensation award passed",
  RR_IN_PROGRESS: "R&R Scheme process started",
  POSSESSION: "Possession taken",
  RR_COMPLETE: "R&R entitlements and infrastructure completed",
};

export function isPublicStage(stage: Stage): boolean {
  return STAGES.indexOf(stage) >= STAGES.indexOf("NOTIFIED");
}

async function toSummary(database: Db, project: ProjectRow): Promise<PublicProjectSummary> {
  const [stageHistory, compensations, rrHistory] = await Promise.all([
    getStageHistoryWith(database, project.id),
    listCompensationsForProjectWith(database, project.id),
    getRRHistoryWith(database, project.id),
  ]);
  const metrics = computeSLAMetrics({ stageHistory, compensations, rrHistory });
  return {
    id: project.id,
    name: project.name,
    purpose: project.purpose,
    state: project.state,
    district: project.district,
    stage: project.stage as Stage,
    metrics,
  };
}

export async function listPublicProjectsWith(database: Db): Promise<PublicProjectSummary[]> {
  const projects = (await listProjectsWith(database)).filter((p) =>
    isPublicStage(p.stage as Stage)
  );
  return Promise.all(projects.map((p) => toSummary(database, p)));
}

function noticesFor(project: ProjectRow, stageHistory: { id: string; toStage: string; createdAt: Date }[]): PublicNotice[] {
  return stageHistory
    .filter((h) => isPublicStage(h.toStage as Stage) && NOTICE_LABELS[h.toStage as Stage])
    .map((h) => ({
      id: h.id,
      projectId: project.id,
      projectName: project.name,
      state: project.state,
      district: project.district,
      stage: h.toStage as Stage,
      label: NOTICE_LABELS[h.toStage as Stage]!,
      occurredAt: h.createdAt,
    }));
}

export async function getPublicProjectDetailWith(
  database: Db,
  id: string
): Promise<PublicProjectDetail | null> {
  const projects = await listProjectsWith(database);
  const project = projects.find((p) => p.id === id);
  if (!project || !isPublicStage(project.stage as Stage)) return null;

  const [stageHistory, parcelList, compensations] = await Promise.all([
    getStageHistoryWith(database, id),
    listParcelsWith(database, id),
    listCompensationsForProjectWith(database, id),
  ]);

  const alignment = parseStoredGeometry(project.geometryType, project.geometryGeoJson);
  const parcelsWithImpact = computeParcelsWithImpact(alignment, parcelList);
  const villageCount = new Set(parcelList.map((p) => p.village)).size;
  const compensationTotal = compensations.reduce((sum, c) => sum + c.total, 0);
  const compensationPaid = compensations
    .filter((c) => c.status === "PAID")
    .reduce((sum, c) => sum + c.total, 0);

  return {
    project: await toSummary(database, project),
    totalAreaHectares: parcelList.reduce((sum, p) => sum + p.areaHectares, 0),
    villageCount,
    parcelCount: parcelList.length,
    compensationPaid,
    compensationTotal,
    alignment,
    parcels: parcelsWithImpact,
    notices: noticesFor(project, stageHistory),
  };
}

export async function getPublicPortfolioStatsWith(database: Db): Promise<PortfolioStats> {
  const projects = (await listProjectsWith(database)).filter((p) =>
    isPublicStage(p.stage as Stage)
  );
  return aggregatePortfolioStatsWith(database, projects);
}

export async function listPublicNoticesWith(
  database: Db,
  limit = 20
): Promise<PublicNotice[]> {
  const projects = (await listProjectsWith(database)).filter((p) =>
    isPublicStage(p.stage as Stage)
  );
  const perProject = await Promise.all(
    projects.map(async (project) => {
      const stageHistory = await getStageHistoryWith(database, project.id);
      return noticesFor(project, stageHistory);
    })
  );
  return perProject
    .flat()
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, limit);
}

export const listPublicProjects = () => listPublicProjectsWith(defaultDb);
export const getPublicProjectDetail = (id: string) => getPublicProjectDetailWith(defaultDb, id);
export const getPublicPortfolioStats = () => getPublicPortfolioStatsWith(defaultDb);
export const listPublicNotices = (limit?: number) => listPublicNoticesWith(defaultDb, limit);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/db/public.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/db/dashboard.ts src/db/public.ts src/db/public.test.ts
git commit -m "feat: add public-portal data layer (stage visibility, notices, aggregates)"
```

---

### Task 2: Route restructure — internal dashboard moves to `/app`

**Files:**
- Move: `src/app/(dashboard)/layout.tsx` → `src/app/app/layout.tsx`
- Move: `src/app/(dashboard)/page.tsx` → `src/app/app/page.tsx`
- Move: `src/app/(dashboard)/projects/[id]/page.tsx` → `src/app/app/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: internal dashboard now lives at `/app` and `/app/projects/[id]` — consumed by Task 3's public layout (the "Government Login" link target).

- [ ] **Step 1: Move the three files**

```bash
mkdir -p src/app/app/projects/[id]
git mv "src/app/(dashboard)/layout.tsx" src/app/app/layout.tsx
git mv "src/app/(dashboard)/page.tsx" src/app/app/page.tsx
git mv "src/app/(dashboard)/projects/[id]/page.tsx" "src/app/app/projects/[id]/page.tsx"
rmdir "src/app/(dashboard)/projects/[id]" "src/app/(dashboard)/projects" "src/app/(dashboard)" 2>/dev/null || true
```

- [ ] **Step 2: Update the one internal link that pointed at the old path**

In `src/app/app/page.tsx`, change:

```tsx
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium hover:underline"
                      >
```

to:

```tsx
                      <Link
                        href={`/app/projects/${project.id}`}
                        className="font-medium hover:underline"
                      >
```

- [ ] **Step 3: Verify no other references broke**

Run: `grep -rn "(dashboard)" src/ || echo "clean"`
Expected: `clean` (no remaining references to the old route group name — `(dashboard)` never appeared in a URL so nothing else could reference it as a path, but this catches stray comments/imports).

- [ ] **Step 4: Type-check and run full test suite**

Run: `npx tsc --noEmit && npm run test`
Expected: both clean — this is a pure file move plus one string change, no test should be affected.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move internal dashboard from / to /app"
```

---

### Task 3: Public layout

**Files:**
- Create: `src/app/(public)/layout.tsx`

**Interfaces:**
- Consumes: `Button` (`@/components/ui/button`), `Link` (`next/link`).
- Produces: shared header for every public page — consumed structurally by Task 4 and Task 5 (both live inside this route group).

- [ ] **Step 1: Write `src/app/(public)/layout.tsx`**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex flex-col gap-3 border-b bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold">
            National Land Acquisition &amp; Management System
          </h1>
          <p className="text-sm text-muted-foreground">
            Public Portal — track land acquisition projects and statutory notices
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/app">Government Login →</Link>
        </Button>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean (this file alone won't compile-error even before Task 4/5 add pages under the group, since it has no page yet — this step exists to catch typos before the next task depends on it).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/layout.tsx"
git commit -m "feat: add public portal layout"
```

---

### Task 4: Public landing page

**Files:**
- Create: `src/components/public-project-search.tsx`
- Create: `src/app/(public)/page.tsx`

**Interfaces:**
- Consumes: `listPublicProjects`, `getPublicPortfolioStats`, `listPublicNotices` (Task 1); `DashboardStats` (`src/components/dashboard-stats.tsx`, existing); `toneBadgeClass`, `stageTone`, `slaStatusTone` (`src/lib/status-colors.ts`, existing); `type PublicProjectSummary`, `type PublicNotice` (Task 1); `Table*`, `Badge`, `Input`, `Card*` (existing shadcn components).
- Produces: the `/` route. No exports consumed by later tasks.

- [ ] **Step 1: Write `src/components/public-project-search.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { stageTone, toneBadgeClass, slaStatusTone } from "@/lib/status-colors";
import type { SLAMetric } from "@/lib/sla";

interface PublicProjectRow {
  id: string;
  name: string;
  state: string;
  district: string;
  stage: string;
  metrics: SLAMetric[];
}

export function PublicProjectSearch({ projects }: { projects: PublicProjectRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q)
    );
  }, [projects, query]);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search by project name, state, or district…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching projects.</p>
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
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.district}, {p.state}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={toneBadgeClass(stageTone(p.stage))}>
                      {p.stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.metrics
                        .filter((m) => m.status !== "not-applicable")
                        .map((m) => (
                          <Badge
                            key={m.id}
                            variant="outline"
                            className={toneBadgeClass(slaStatusTone(m.status))}
                          >
                            {m.label}
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
  );
}
```

- [ ] **Step 2: Write `src/app/(public)/page.tsx`**

```tsx
import Link from "next/link";
import {
  listPublicProjects,
  getPublicPortfolioStats,
  listPublicNotices,
} from "@/db/public";
import { DashboardStats } from "@/components/dashboard-stats";
import { PublicProjectSearch } from "@/components/public-project-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PublicLandingPage() {
  const [projects, stats, notices] = await Promise.all([
    listPublicProjects(),
    getPublicPortfolioStats(),
    listPublicNotices(),
  ]);

  return (
    <div className="space-y-6">
      <DashboardStats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">Projects</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notified projects yet.</p>
          ) : (
            <PublicProjectSearch projects={projects} />
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent notices</CardTitle>
          </CardHeader>
          <CardContent>
            {notices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notices yet.</p>
            ) : (
              <ul className="space-y-3">
                {notices.map((n) => (
                  <li key={n.id} className="text-sm">
                    <Link href={`/projects/${n.projectId}`} className="font-medium hover:underline">
                      {n.projectName}
                    </Link>
                    <p className="text-muted-foreground">
                      {n.label} — {n.occurredAt.toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/public-project-search.tsx "src/app/(public)/page.tsx"
git commit -m "feat: add public landing page (stats, project search, notices)"
```

---

### Task 5: Public project detail page

**Files:**
- Create: `src/app/(public)/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `getPublicProjectDetail` (Task 1); `ProjectMap` (`src/components/project-map.tsx`, existing); `STAGES` (`src/lib/workflow.ts`); `stageTone`, `toneBadgeClass`, `slaStatusTone` (existing); `notFound` (`next/navigation`).
- Produces: the `/projects/[id]` route. No exports consumed elsewhere.

- [ ] **Step 1: Write `src/app/(public)/projects/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getPublicProjectDetail } from "@/db/public";
import { STAGES } from "@/lib/workflow";
import { ProjectMap } from "@/components/project-map";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { stageTone, toneBadgeClass, slaStatusTone } from "@/lib/status-colors";

function formatLakh(amount: number): string {
  return `₹${(amount / 100000).toFixed(1)}L`;
}

export default async function PublicProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPublicProjectDetail(id);
  if (!detail) notFound();

  const { project } = detail;
  const currentIndex = STAGES.indexOf(project.stage);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{project.name}</h2>
        <p className="text-sm text-muted-foreground">{project.purpose}</p>
        <p className="text-sm text-muted-foreground">
          {project.district}, {project.state}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-wrap gap-2">
            {STAGES.map((stage, i) => (
              <li key={stage}>
                <Badge
                  variant="outline"
                  className={
                    i === currentIndex
                      ? toneBadgeClass(stageTone(stage))
                      : i < currentIndex
                        ? "border-muted-foreground/20 bg-muted text-muted-foreground"
                        : "border-dashed text-muted-foreground/60"
                  }
                >
                  {stage}
                </Badge>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Area</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {detail.totalAreaHectares.toFixed(1)} ha
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Villages</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{detail.villageCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Parcels</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{detail.parcelCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Compensation paid
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatLakh(detail.compensationPaid)} / {formatLakh(detail.compensationTotal)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">SLA health</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {project.metrics
            .filter((m) => m.status !== "not-applicable")
            .map((m) => (
              <Badge key={m.id} variant="outline" className={toneBadgeClass(slaStatusTone(m.status))}>
                {m.label}: {m.status}
              </Badge>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Map</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectMap alignment={detail.alignment} parcels={detail.parcels} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Notices</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.notices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notices yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {detail.notices.map((n) => (
                <li key={n.id}>
                  <span className="font-medium">{n.label}</span>{" "}
                  <span className="text-muted-foreground">
                    — {n.occurredAt.toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/projects/[id]/page.tsx"
git commit -m "feat: add public project detail page"
```

---

### Task 6: Full regression and demo verification

**Files:** none — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (prior suite + this plan's 9 new tests in `public.test.ts`).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Verify the public/internal boundary end-to-end**

```bash
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
npm run dev > /tmp/nextdev-public.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'

curl -s http://localhost:3000/ -o /tmp/public-landing.html
grep -o "Public Portal" /tmp/public-landing.html | head -1
grep -o "Government Login" /tmp/public-landing.html | head -1

curl -s http://localhost:3000/app -o /tmp/internal-dashboard.html
grep -o "Switch demo role" /tmp/internal-dashboard.html | head -1

# a public-eligible project id should render; the draft-stage Koraput project should 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/projects/p-tn-chennai-metro-poonamallee 2>/dev/null || true

grep -aiE "error" /tmp/nextdev-public.log | grep -v "Warning: Next.js ignored package-lock"
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
```

Expected: `/` shows "Public Portal" and "Government Login"; `/app` shows the internal role-switcher UI; no server errors. (The specific project id above is from the dashboards-sla-health seed data — check `src/db/seed-data.ts` for the actual seeded public-eligible project ids if that one doesn't exist, and re-run against a real id.)

- [ ] **Step 4: Stop the dev server**

```bash
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
```

---

## What this plan does not cover

- Landowner self-service, grievance/RTI ticketing (🟡 P1)
- Per-parcel/per-family compensation disclosure
- Multi-language UI (🟡 P1)
- Any new demo login users or auth changes
