# Dashboards & SLA Health — Design

**Parent spec:** `docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md` (Section 6.5 "Dashboards & Reporting", Section 2.6 "CAG audit findings")

## 1. Context

Every P0 workflow module (project lifecycle, compensation, GIS, documents, R&R Award) is now built and audit-logged. What doesn't exist yet is anything that turns that audit trail into the evidence the pitch needs: today's "dashboard" (`(dashboard)/page.tsx`) is a flat, unfiltered project list with no aggregate stats and no SLA computation of any kind. Section 6.5 (🟢 P0) calls for a national dashboard, state-wise drill-down, and SLA/timeline health computed against the RFCTLARR Act's real statutory deadlines — this closes that gap.

It also closes the loop on Section 2.6: the CAG audit's own findings (families never paid, stale rates, benefits paid 5-60 years late) are entirely a category of *tracking* failure. SLA health is the direct, citable answer.

The demo will be judged locally by a Tamil Nadu audience. The existing seed data has exactly one project (Koraput, Odisha), which makes a "national dashboard" or "state-wise drill-down" meaningless — there's nothing to aggregate or compare. This design also seeds a richer, TN-weighted dataset so the feature has something real to show.

## 2. Scope

**In scope:**
- SLA health computation against 3 statutory deadlines that this app already has real timestamps for.
- Portfolio-level aggregation (national and per-state) — project counts by stage, area under acquisition, compensation paid vs. total, SLA breach/at-risk counts.
- A role-scoped stats section added to the existing `/` dashboard page (central → national + state breakdown; state → own-state totals; district/agency/field → unchanged plain list).
- Two Recharts visualizations: a stage-distribution bar chart and an SLA-status pie chart.
- An SLA badge column on the existing project table, visible to all roles.
- Seed data: 8 demo projects (6 Tamil Nadu, Odisha, Karnataka), deliberately spanning on-track / at-risk / breached / not-yet-applicable SLA outcomes, with backdated timestamps so the SLA math is real without waiting real months.

**Out of scope (explicitly deferred):**
- The 18-month infrastructural R&R (Third Schedule) deadline — no build-out tracking exists anywhere in the app (Third Schedule checklist itself is deferred, per the compensation-rr and rr-award-workflow plans), so this SLA cannot be honestly computed. Excluded rather than faked.
- Customizable MIS report builder, cross-state comparison view (🟡 P1, parent spec 6.5).
- Escalation matrix / auto-notify on breach (⚪ P2, parent spec 6.5) — this design computes and displays SLA status; it does not send anything.
- Any change to per-project RBAC scoping (e.g. district users only seeing their own district's projects) — out of scope for this feature; the existing coarse role-based `can()` permission model is unchanged. This design only changes *what the dashboard page shows*, not who can act on what.
- Historical seed data (stage/RR transitions, compensation records) is written directly with backdated timestamps rather than through a login session, so no new users are needed just to *seed* cross-state history.

**Correction found while mapping exact signatures (see Section 5.1):** `Session` doesn't currently carry `state`, and the only existing `state`-role demo user is tied to Odisha — which would make it impossible to ever demo a Tamil-Nadu-scoped dashboard, the explicit point of weighting the seed data toward TN. One new demo user is added to fix this (see Section 6).

## 3. SLA Health Computation

New pure module `src/lib/sla.ts`, structurally similar to `src/lib/compensation.ts` — no DB access, operates on data already fetched by the caller.

```ts
export type SLAStatus = "on-track" | "at-risk" | "breached" | "not-applicable";

export interface SLAMetric {
  id: "declaration" | "compensation" | "rr-award";
  label: string;
  deadlineMonths: number;
  startedAt: Date | null;
  completedAt: Date | null;
  status: SLAStatus;
  daysRemaining: number | null; // negative once breached; null when not-applicable
}

export function computeSLAMetrics(
  input: {
    stageHistory: { action: string; toStage: string; createdAt: Date }[];
    compensations: { paidAt: Date | null }[];
    rrStage: string | null;
  },
  asOf: Date = new Date()
): SLAMetric[]
```

Three metrics, each independently computed:

| id | Clock starts | Clock stops | Deadline |
|---|---|---|---|
| `declaration` | `NOTIFIED` stage timestamp (Section 11) | `DECLARED` stage timestamp (Section 19) | 12 months |
| `compensation` | `AWARDED` stage timestamp | every row in `compensations` for the project has `paidAt` set | 3 months |
| `rr-award` | `AWARDED` stage timestamp | `rrStage === "RR_AWARDED"` | 6 months |

Status rules (evaluated at `asOf`, default `new Date()`):
- **`not-applicable`** — the clock hasn't started (e.g. project hasn't reached `NOTIFIED"` yet for the `declaration` metric). No badge is shown for this in the UI.
- **`breached`** — the deadline has passed before the stop condition was met. If the stop condition *was* met, but after the deadline, still `breached` (it happened, just late) — `daysRemaining` reflects how late.
- **`at-risk`** — not yet complete, deadline hasn't passed, but less than 20% of the window remains.
- **`on-track`** — everything else: comfortably within the window, or completed on time.

`daysRemaining` is `deadlineDate - asOf` in days when incomplete (negative once breached), or `deadlineDate - completedAt` when complete (always ≥ 0, since a late completion is classified `breached` above, not given a negative "remaining").

The `rr-award` metric is a stated proxy: Chart 5.1's step 6 ("R&R Award passed, benefits paid") is the closest real event to "monetary R&R entitlements disbursed" that this app tracks, since per-household entitlement disbursement (Second Schedule) is out of scope everywhere in this app.

### 3.1 Tests (`src/lib/sla.test.ts`)

Table-driven: for each of the 3 metrics, a case each for `not-applicable` (clock not started), `on-track` (plenty of time / completed early), `at-risk` (<20% window left), and `breached` (deadline passed incomplete, and deadline passed but completed late). Plus one full-project integration case combining all three metrics at once.

## 4. Data Layer

New `src/db/dashboard.ts`, following the existing `db/*.ts` convention (`*With(database, ...)` core + zero-arg `defaultDb` wrapper). Reuses existing accessors (`listProjectsWith`, `getStageHistoryWith`, `listCompensationsForProjectWith`, `getRRStageWith`) per project — N+1 queries are acceptable at this app's seeded scale (8 projects).

```ts
export interface ProjectSLASummary {
  project: Project; // as returned by listProjectsWith
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

export async function getProjectsWithSLAWith(
  database: Db,
  filter?: { state?: string }
): Promise<ProjectSLASummary[]>

export async function getPortfolioStatsWith(
  database: Db,
  filter?: { state?: string }
): Promise<PortfolioStats>

export async function getStateBreakdownWith(database: Db): Promise<StateBreakdownRow[]>
```

`totalAreaHectares` sums `parcels.areaHectares` across all parcels of in-scope projects (all parcels, not just impact-buffer-filtered ones — that filter is alignment-relative and per-project, not meaningful as a portfolio total). `compensationPaid`/`compensationTotal` sum `compensations.total` for `PAID` rows vs. all rows.

Zero-arg wrappers (`getProjectsWithSLA`, `getPortfolioStats`, `getStateBreakdown`) added the same way every other `db/*.ts` module does it.

### 4.1 Tests (`src/db/dashboard.test.ts`)

In-memory libSQL, same harness pattern as `projects.test.ts`/`rr.test.ts`: seed 2-3 projects across 2 states at different stages/compensation states, assert stage counts, area sum, compensation sums, and SLA counts land where expected. One test per exported function is enough — the SLA logic itself is already covered by `sla.test.ts`.

## 5. Page & Component Changes

### 5.1 Session gains `state`/`district`

`Session` (`src/lib/auth.ts`) adds two optional fields:

```ts
export interface Session {
  userId: string;
  name: string;
  role: Role;
  state?: string;
  district?: string;
}
```

`src/app/api/auth/login/route.ts` passes `user.state`/`user.district` through to `setSession` (both already exist on `DemoUser`, they're just not threaded into the session today). No cookie-format migration concern — this is a demo-only cookie with no existing persisted sessions to preserve across the change.

### 5.2 Dashboard page

No new routes. `(dashboard)/page.tsx` (the existing `/` page) gains a role-scoped stats section above the existing project table:

- **`central`**: national `getPortfolioStats()` + `getStateBreakdown()` table
- **`state`**: `getPortfolioStats({ state: session.state })` only — no breakdown table (nothing to break down within one state)
- **`district` / `agency` / `field`**: no stats section — page is unchanged for these roles

The existing project table (all roles) is fed by `getProjectsWithSLA()` instead of the current bare `listProjects()`, adding one new column: 3 small `Badge`s (one per metric with `status !== "not-applicable"`), colored via the existing `toneBadgeClass` (`on-track`→success, `at-risk`→pending, `breached`→danger).

New client component `src/components/dashboard-stats.tsx` (`"use client"`, required for Recharts), receiving `PortfolioStats` and optionally `StateBreakdownRow[]` as props from the server page:
- 4 stat tiles (`Card`): project count, total area (ha), compensation paid/total, SLA breach count
- Bar chart (Recharts `BarChart`): project count per `Stage`, bars colored via a new hex-value export from `status-colors.ts` (`stageTone` → hex, since Recharts needs real color values, not Tailwind classes)
- Pie chart (Recharts `PieChart`): on-track/at-risk/breached counts across every applicable metric-instance in the current scope
- State breakdown `Table` (rendered only when `stateBreakdown` prop is present — i.e. central role only)

`recharts` is added as a new dependency (already the stack's named choice for charts, parent spec Section 3.2).

No automated test for `dashboard-stats.tsx` — same rationale as every other chart/panel component in this codebase (`compensation-panel.tsx`, `rr-panel.tsx`): verified manually against the seeded data.

## 6. Seed Data

### 6.1 New demo user

`src/db/seed-data.ts`'s `DEMO_USERS` gains one entry:

```ts
{ id: "u-state-2", name: "Lakshmi Narayanan (State Govt, Tamil Nadu)", role: "state", state: "Tamil Nadu" },
```

Logging in as `u-state-2` is how the state-scoped Tamil Nadu dashboard actually gets demoed.

### 6.2 Project timeline data

`src/db/seed.ts` is rewritten around a small seed-only helper that mirrors the real transition functions but accepts an explicit historical timestamp instead of `new Date()`, so backdated SLA scenarios can be constructed deterministically:

```ts
async function seedProjectTransition(
  projectId: string,
  action: Action,
  actorRole: Role,
  occurredAt: Date
): Promise<Stage>
// mirrors applyProjectTransitionWith, but writes occurredAt as both
// projects.updatedAt and the stageHistory row's createdAt

async function seedRRTransition(
  projectId: string,
  action: RRAction,
  actorRole: Role,
  occurredAt: Date
): Promise<RRStage>
// same idea, for rrStageHistory / projects.rrStage
```

Both still call `transitionProject`/`transitionRR` for validation, so every seeded project reaches its target stage through a real, valid sequence — only the *timestamp* is fabricated, not the state machine path.

8 projects (the existing Koraput one is preserved as-is; 7 new). All new project/history/compensation timestamps are computed as `now - N months` at seed time, so the demo stays realistic regardless of when it's actually run:

| # | Project | State / District | Geometry | Ends at | Timeline (relative to seed run) | SLA outcome |
|---|---|---|---|---|---|---|
| 1 | Koraput River Bridge Project *(existing, unchanged)* | Odisha / Koraput | LineString | full lifecycle to `POSSESSION`/`RR_AWARDED`, all "today" | unchanged from current seed | on-track (trivial control case — instant transitions) |
| 2 | Chennai–Salem Green Corridor Expressway | Tamil Nadu / Krishnagiri | LineString | `NOTIFIED` | notified 14 months ago, never declared | **breached** — declaration |
| 3 | Chennai Metro Phase 2 – Poonamallee Extension | Tamil Nadu / Chennai | LineString | `AWARDED`, 1 of 2 parcels' compensation paid | awarded 2.5 months ago | **at-risk** — compensation |
| 4 | Cauvery–Vaigai–Gundar Link Canal (Sivaganga Reach) | Tamil Nadu / Sivaganga | Polygon | `RR_IN_PROGRESS`, R&R at `SUBMITTED_TO_COLLECTOR` | awarded 5 months ago; compensation fully paid within the first month | **at-risk** — rr-award (compensation metric on-track) |
| 5 | Ennore–Kattupalli Port Connectivity Corridor | Tamil Nadu / Thiruvallur | LineString | `RR_COMPLETE` | full lifecycle, every deadline met with margin | on-track — success story |
| 6 | Coimbatore–Sathyamangalam NH Bypass | Tamil Nadu / Coimbatore | LineString | `SIA` | created 1 month ago, not yet notified | not-applicable (too early for any metric) |
| 7 | SIPCOT Industrial Corridor Expansion – Perambalur | Tamil Nadu / Perambalur | Polygon | `AWARDED`, compensation unpaid | awarded 4 months ago | **breached** — compensation |
| 8 | Bengaluru Peripheral Ring Road Corridor | Karnataka / Bengaluru Urban | LineString | `NOTIFIED` | notified 3 months ago | on-track — early, plenty of runway |

Each new project gets 2-3 parcels (reusing `createParcel`) and a `compensationRates` row for its district (reusing `setCompensationRate`), matching the existing Koraput pattern. Compensation records for projects at or past `AWARDED` are inserted directly (not via `createCompensationWith`, which hardcodes `assessedAt`/`paidAt` to "now") so their `assessedAt`/`paidAt` can be backdated consistently with the project's own timeline.

Coordinates are illustrative points near each named district's real location — synthetic demo geometry, not an actual survey of these real-world projects (consistent with the parent spec's Section 3.3 standing decision to seed synthetic-but-structurally-real data rather than fabricate precise real-world facts).

### 6.3 Verification

Because this session's manual API testing already advanced the existing Koraput project's real local `local.db` state (it's now sitting at `POSSESSION`/`RR_AWARDED` from earlier verification steps, not the fresh `DRAFT` the seed script inserts), verification for this plan includes a full local database reset — delete `local.db`, `npm run db:push`, `npm run db:seed` — so the demo dataset is deterministic and doesn't depend on incidental prior manual testing.

## 7. What this design does not cover

- The 18-month infrastructural R&R deadline (no data source; see Scope)
- Customizable report builder, cross-state comparison view, escalation/auto-notify (all 🟡/⚪, parent spec 6.5)
- Any RBAC/data-scoping change to who can see or act on which projects
- New demo login users
