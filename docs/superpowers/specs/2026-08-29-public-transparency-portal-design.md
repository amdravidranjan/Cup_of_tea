# Public Transparency Portal — Design

**Parent spec:** `docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md` (Section 6.8 "Public / Transparency Portal", Section 2.5 "Bhoomi Rashi precedent")

## 1. Context

Every internal role (agency, district, state, central) now has a working lifecycle, compensation, GIS, documents, and dashboard experience. What's missing is the one role explicitly named in the spec that isn't a demo-role login at all: **Public/Citizen (no login)** — a read-only transparency view (Section 6.8, 🟢 P0). This is also the platform's central pitch framing (Section 2.5): Bhoomi Rashi's model, generalized beyond NHAI highways, made citizen-visible the way the real portal is. A judge should be able to land on the app with no login and immediately see what it's for, before ever touching the role-switcher.

## 2. Scope

**In scope:**
- The public portal becomes the site's landing page at `/`. The existing role-based internal dashboard moves from `/` to `/app` (and `/app/projects/[id]`) — a URL change, no behavior change, for the internal UI.
- `/` (public landing): national aggregate stats, a searchable list of public-eligible projects, a sitewide "recent notices" feed.
- `/projects/[id]` (public detail): one project's status, SLA health, aggregate compensation, map, and its own notices — for public-eligible projects only.
- A project becomes public once it reaches `NOTIFIED` stage or later — the real trigger point (Section 11 preliminary notification) per the parent spec's own RFCTLARR research (Section 2.1). Pre-notification projects (`DRAFT`/`SCRUTINY`/`SIA`) are not public record and return 404 if probed by id.
- Data exposure is status/aggregate only: stage, SLA badges, area/village/parcel counts, total compensation paid vs. assessed (₹, portfolio- or project-level sum). No landowner/family names, no per-parcel compensation amounts, no documents.

**Out of scope (explicitly deferred):**
- Landowner self-service (claim status lookup, objection/document upload) and grievance/RTI ticket submission — both 🟡 P1, parent spec 6.8.
- Per-parcel compensation disclosure — the parent spec's Section 6.8 P0 line is "project status, notices, aggregate stats," not a compensation ledger; showing individual amounts (even without names) is a P1-adjacent transparency decision this plan doesn't make.
- Multi-language UI (🟡 P1, parent spec 6.9) — the public page is English-only, same as the rest of the app today.
- Any new demo users or login flow — the public portal has no login by definition.
- Notices as a first-class DB entity — they're derived from existing `stage_history` rows, not a new table (see Section 4).

## 3. Routing Restructure

The current `src/app/(dashboard)/` route group (URL `/`) is renamed to a real `src/app/app/` segment (URL `/app`) — this is a directory rename only; `layout.tsx` and `page.tsx` content are unchanged except:
- `page.tsx`'s project-name link changes from `` `/projects/${project.id}` `` to `` `/app/projects/${project.id}` `` (the one internal reference to this path anywhere in the codebase — verified by search).

A new `src/app/(public)/` route group (no URL effect) holds:
- `page.tsx` → `/`
- `projects/[id]/page.tsx` → `/projects/[id]`
- `layout.tsx` → shared public header: site title, one-line framing text, a "Government Login →" link to `/app`. No session check, no `RoleSwitcher`.

No route collision: `/app/projects/[id]` (internal) and `/projects/[id]` (public) are distinct paths under the same dynamic segment name, which Next.js treats as independent route trees.

## 4. Data Layer

New `src/db/public.ts`, following the existing `db/*.ts` convention (`*With(database, ...)` core + zero-arg `defaultDb` wrapper). Reuses `STAGES`/`Stage` (`src/lib/workflow.ts`) and existing per-project accessors (`getStageHistoryWith`, `listParcelsWith`, `listCompensationsForProjectWith`) the same way `src/db/dashboard.ts` does.

```ts
export function isPublicStage(stage: Stage): boolean {
  return STAGES.indexOf(stage) >= STAGES.indexOf("NOTIFIED");
}

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
  id: string;              // stage_history row id
  projectId: string;
  projectName: string;
  state: string;
  district: string;
  stage: Stage;             // the toStage this notice announces
  label: string;            // plain-language description, see NOTICE_LABELS below
  occurredAt: Date;
}

export interface PublicProjectDetail {
  project: PublicProjectSummary;
  totalAreaHectares: number;
  villageCount: number;
  parcelCount: number;
  compensationPaid: number;
  compensationTotal: number;
  alignment: Geometry | null;          // from src/lib/geo, for ProjectMap
  parcels: /* ParcelWithImpact[] from src/lib/geo */;
  notices: PublicNotice[];             // this project's own public-stage history
}

export async function listPublicProjectsWith(database: Db): Promise<PublicProjectSummary[]>
export async function getPublicProjectDetailWith(database: Db, id: string): Promise<PublicProjectDetail | null>
export async function getPublicPortfolioStatsWith(database: Db): Promise<PortfolioStats>  // from src/db/dashboard.ts
export async function listPublicNoticesWith(database: Db, limit?: number): Promise<PublicNotice[]>
```

Plain-language notice labels (module-local constant, not stored):

```ts
const NOTICE_LABELS: Partial<Record<Stage, string>> = {
  NOTIFIED: "Section 11 Preliminary Notification issued",
  DECLARED: "Section 19 Final Declaration published",
  AWARDED: "Compensation award passed",
  RR_IN_PROGRESS: "R&R Scheme process started",
  POSSESSION: "Possession taken",
  RR_COMPLETE: "R&R entitlements and infrastructure completed",
};
```

Only stage-history rows whose `toStage` is a public stage (and thus has a label) are notices — this reuses the same `isPublicStage` boundary, so a project can never leak a notice for a pre-notification transition (`DRAFT→SCRUTINY`, etc.).

`getPublicPortfolioStatsWith` reuses `src/db/dashboard.ts`'s aggregation logic rather than reimplementing stage/area/compensation/SLA rollup math. `dashboard.ts`'s private `aggregate(database, projects)` helper is exported as `aggregatePortfolioStatsWith` (rename, not a new function) so `public.ts` can call it with the public-filtered project list — same pattern `getStateBreakdownWith` already uses internally.

`getPublicProjectDetailWith` returns `null` both when the project doesn't exist and when it exists but isn't yet public — the caller (`notFound()`) can't distinguish the two, which is the point: a draft project's existence isn't confirmed or denied by probing its id.

### 4.1 Tests (`src/db/public.test.ts`)

Same in-memory libSQL harness as `dashboard.test.ts`. Seed 3 projects: one `DRAFT` (never public), one `NOTIFIED` (public, no compensation yet), one `AWARDED` with a mix of paid/unpaid compensation. Assert: `listPublicProjectsWith` excludes the draft; `getPublicProjectDetailWith` returns `null` for the draft's id and a populated detail for the other two; `listPublicNoticesWith` only contains labeled stages and excludes the draft's `CREATE`/`APPROVE` history; `getPublicPortfolioStatsWith` excludes the draft project's area/compensation from the totals.

## 5. Public Pages

### 5.1 `(public)/layout.tsx`

Minimal header: "National Land Acquisition & Management System — Public Portal" title, one line of framing text ("Track land acquisition projects and statutory notices across India"), and a "Government Login →" link to `/app` (reuses the existing `Button`/`Link` pattern, not the `RoleSwitcher` component — that stays internal-only).

### 5.2 `(public)/page.tsx`

Server component:
- `getPublicPortfolioStats()` fed into a reused `DashboardStats` (from Task 5 of the dashboards-sla-health plan) — same 4 stat tiles + 2 charts, no `stateBreakdown` prop (that's an internal/central-only view).
- `listPublicProjects()` rendered as a `Table` (same shape as the internal project table: name → link, district/state, stage badge, SLA badges) with a client-side text filter input (state/district/name substring match) — no new API route, filtering happens in a small `"use client"` wrapper component (`src/components/public-project-search.tsx`) over the server-fetched list, mirroring how `RoleSwitcher` is the only other client component pulled out of a server page.
- `listPublicNotices()` rendered as a simple reverse-chronological list ("*Chennai Metro Phase 2 — Section 19 Final Declaration published — 12 Mar 2026*"), each item linking to its project.

### 5.3 `(public)/projects/[id]/page.tsx`

Server component, `notFound()` when `getPublicProjectDetail(id)` returns `null`:
- Header block: name, purpose, district/state.
- Stage tracker (reuses the same `STAGES.map` badge-row pattern as the internal detail page, read-only).
- SLA badges (reuses `toneBadgeClass(slaStatusTone(...))`, same as the internal dashboard column).
- Stat row: total area, village count, parcel count, compensation paid/total.
- `ProjectMap` (existing component, unchanged) fed `alignment` + `parcels`.
- Notices list, this project only.

No client-side interactivity beyond what `ProjectMap` already has (it's already a client component).

## 6. What this design does not cover

- Landowner self-service, grievance/RTI ticketing (🟡 P1, parent spec 6.8)
- Per-parcel/per-family compensation disclosure
- Multi-language UI (🟡 P1, parent spec 6.9)
- Any new demo login users or auth changes
- A `notices` database table — notices are always derived from `stage_history` at read time
