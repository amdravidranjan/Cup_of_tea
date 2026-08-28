# R&R Award Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the real 6-step R&R Award workflow (CAG audit Chart 5.1) as its own gated sub-state-machine, and close the existing gap where `RR_IN_PROGRESS:COMPLETE_RR` currently succeeds unconditionally with no R&R process actually having happened.

**Architecture:** Mirrors the main project workflow's proven pattern exactly: a pure state-machine function (`src/lib/rr-workflow.ts`, structurally identical to `src/lib/workflow.ts`), a `rrStage` column on `projects` plus an append-only `rrStageHistory` audit table (identical shape to `stageHistory`), and a dedicated API route. The existing `COMPLETE_RR` transition gets one targeted check added, not a rewrite. UI is built with the shadcn/ui components from the UI foundation plan.

**Tech Stack:** No new dependencies — existing Next.js/Drizzle/libsql/Vitest/shadcn stack.

**Spec:** `docs/superpowers/specs/2026-08-29-ui-foundation-and-rr-workflow-design.md` (Section 4); parent spec `docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md` (Section 2.3)

## Global Constraints

- Same as prior plans: RBAC enforced server-side, DB/auth/storage remain stubbed, single Next.js monolith.
- The six R&R stages map one-to-one to the six literal Chart 5.1 steps — no invented steps, no merged steps.
- Steps 1-4 and 6 (survey, draft scheme, publish+hearing, submit to Collector, final award) are `district`-role actions (Sub-Collector/Collector share the same district-level authority chain in this app's RBAC). Step 5 (Committee review, forwarded to Commissioner R&R for Government approval) is a `state`-role action, mirroring how the main workflow already gates the equivalent government-level sign-off.
- `rrStageHistory` is append-only and immutable, exactly like `stageHistory` — never update or delete a row.
- This plan does not implement entitlement tracking, the Third Schedule checklist, versioned entitlement rates, or dispute/appeal workflow — those are explicitly out of scope (parent spec Section 6.2, this design's Section 2).
- Depends on the UI foundation plan (`docs/superpowers/plans/2026-08-29-ui-foundation.md`) being complete — Task 5 of this plan uses `Card`, `Badge`, `Button`, `Textarea`, `Label` from `src/components/ui/*`.

---

### Task 1: R&R schema

**Files:**
- Modify: `src/db/schema.ts`

**Interfaces:**
- Produces:
  - `projects.rrStage: text, nullable` — current R&R sub-stage; `null` until the R&R workflow starts.
  - `rrStageHistory` table: `{ id, projectId, fromStage: nullable, toStage, action, actorId, actorRole, note: nullable, createdAt }`

- [ ] **Step 1: Add `rrStage` to the `projects` table in `src/db/schema.ts`**

Find the `projects` table definition and add one line after `geometryGeoJson`:

```ts
  geometryGeoJson: text("geometry_geo_json"),
  rrStage: text("rr_stage"),
```

- [ ] **Step 2: Add the `rrStageHistory` table**

Append after the `compensations` table:

```ts
export const rrStageHistory = sqliteTable("rr_stage_history", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  fromStage: text("from_stage"),
  toStage: text("to_stage").notNull(),
  action: text("action").notNull(),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

- [ ] **Step 3: Push and verify**

```bash
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
npm run db:push
```

Expected: completes without error.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add R&R stage column and stage-history schema"
```

---

### Task 2: R&R state machine (pure, tested)

**Files:**
- Create: `src/lib/rr-workflow.ts`
- Test: `src/lib/rr-workflow.test.ts`

**Interfaces:**
- Consumes: `Role` from `src/lib/workflow.ts`
- Produces:
  - `type RRStage = "SURVEYED" | "SCHEME_DRAFTED" | "PUBLISHED" | "SUBMITTED_TO_COLLECTOR" | "COMMITTEE_APPROVED" | "RR_AWARDED"`
  - `type RRAction = "COMPLETE_SURVEY" | "COMPLETE_SCHEME" | "COMPLETE_HEARING" | "SUBMIT_TO_COLLECTOR" | "APPROVE_RR_SCHEME" | "PASS_RR_AWARD"`
  - `RR_STAGES: RRStage[]` — the six stages in order.
  - `function transitionRR(current: RRStage | null, action: RRAction, actorRole: Role): RRStage`
  - `function getAvailableRRActions(stage: RRStage | null, role: Role): RRAction[]`
  - All used by Task 3's DB layer and Task 5's UI.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/rr-workflow.test.ts
import { describe, it, expect } from "vitest";
import { transitionRR, getAvailableRRActions, RR_STAGES, type Role } from "./rr-workflow";

describe("transitionRR", () => {
  it("starts the workflow with COMPLETE_SURVEY by district", () => {
    expect(transitionRR(null, "COMPLETE_SURVEY", "district")).toBe("SURVEYED");
  });

  it("walks the full 6-step happy path", () => {
    let stage = transitionRR(null, "COMPLETE_SURVEY", "district");
    stage = transitionRR(stage, "COMPLETE_SCHEME", "district");
    stage = transitionRR(stage, "COMPLETE_HEARING", "district");
    stage = transitionRR(stage, "SUBMIT_TO_COLLECTOR", "district");
    stage = transitionRR(stage, "APPROVE_RR_SCHEME", "state");
    stage = transitionRR(stage, "PASS_RR_AWARD", "district");
    expect(stage).toBe("RR_AWARDED");
  });

  it("rejects an action not valid for the current stage", () => {
    expect(() => transitionRR(null, "PASS_RR_AWARD", "district")).toThrow(/no r&r transition/i);
  });

  it("rejects district attempting the government-approval step", () => {
    let stage = transitionRR(null, "COMPLETE_SURVEY", "district");
    stage = transitionRR(stage, "COMPLETE_SCHEME", "district");
    stage = transitionRR(stage, "COMPLETE_HEARING", "district");
    stage = transitionRR(stage, "SUBMIT_TO_COLLECTOR", "district");
    expect(() => transitionRR(stage, "APPROVE_RR_SCHEME", "district" as Role)).toThrow(/role/i);
  });

  it("RR_STAGES lists all 6 stages in order", () => {
    expect(RR_STAGES).toHaveLength(6);
    expect(RR_STAGES[0]).toBe("SURVEYED");
    expect(RR_STAGES[RR_STAGES.length - 1]).toBe("RR_AWARDED");
  });
});

describe("getAvailableRRActions", () => {
  it("returns COMPLETE_SURVEY for district when the workflow has not started", () => {
    expect(getAvailableRRActions(null, "district")).toEqual(["COMPLETE_SURVEY"]);
  });

  it("returns nothing for a role with no valid action at that stage", () => {
    expect(getAvailableRRActions(null, "state")).toEqual([]);
  });

  it("returns APPROVE_RR_SCHEME for state at SUBMITTED_TO_COLLECTOR, nothing for district", () => {
    expect(getAvailableRRActions("SUBMITTED_TO_COLLECTOR", "state")).toEqual([
      "APPROVE_RR_SCHEME",
    ]);
    expect(getAvailableRRActions("SUBMITTED_TO_COLLECTOR", "district")).toEqual([]);
  });

  it("returns nothing at the terminal stage", () => {
    expect(getAvailableRRActions("RR_AWARDED", "district")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/rr-workflow.test.ts`
Expected: FAIL — `Cannot find module './rr-workflow'`.

- [ ] **Step 3: Write `src/lib/rr-workflow.ts`**

```ts
import type { Role } from "./workflow";

export type RRStage =
  | "SURVEYED"
  | "SCHEME_DRAFTED"
  | "PUBLISHED"
  | "SUBMITTED_TO_COLLECTOR"
  | "COMMITTEE_APPROVED"
  | "RR_AWARDED";

export type RRAction =
  | "COMPLETE_SURVEY"
  | "COMPLETE_SCHEME"
  | "COMPLETE_HEARING"
  | "SUBMIT_TO_COLLECTOR"
  | "APPROVE_RR_SCHEME"
  | "PASS_RR_AWARD";

export const RR_STAGES: RRStage[] = [
  "SURVEYED",
  "SCHEME_DRAFTED",
  "PUBLISHED",
  "SUBMITTED_TO_COLLECTOR",
  "COMMITTEE_APPROVED",
  "RR_AWARDED",
];

interface RRTransitionRule {
  next: RRStage;
  allowedRoles: Role[];
}

const RR_TRANSITIONS: Record<string, RRTransitionRule> = {
  "null:COMPLETE_SURVEY": { next: "SURVEYED", allowedRoles: ["district"] },
  "SURVEYED:COMPLETE_SCHEME": { next: "SCHEME_DRAFTED", allowedRoles: ["district"] },
  "SCHEME_DRAFTED:COMPLETE_HEARING": { next: "PUBLISHED", allowedRoles: ["district"] },
  "PUBLISHED:SUBMIT_TO_COLLECTOR": {
    next: "SUBMITTED_TO_COLLECTOR",
    allowedRoles: ["district"],
  },
  "SUBMITTED_TO_COLLECTOR:APPROVE_RR_SCHEME": {
    next: "COMMITTEE_APPROVED",
    allowedRoles: ["state"],
  },
  "COMMITTEE_APPROVED:PASS_RR_AWARD": { next: "RR_AWARDED", allowedRoles: ["district"] },
};

export function transitionRR(
  current: RRStage | null,
  action: RRAction,
  actorRole: Role
): RRStage {
  const key = `${current ?? "null"}:${action}`;
  const rule = RR_TRANSITIONS[key];
  if (!rule) {
    throw new Error(
      `No R&R transition for action "${action}" from stage "${current ?? "null"}"`
    );
  }
  if (!rule.allowedRoles.includes(actorRole)) {
    throw new Error(
      `Role "${actorRole}" cannot perform "${action}" in the R&R workflow from stage "${current ?? "null"}"`
    );
  }
  return rule.next;
}

export function getAvailableRRActions(stage: RRStage | null, role: Role): RRAction[] {
  const prefix = `${stage ?? "null"}:`;
  return Object.entries(RR_TRANSITIONS)
    .filter(([key, rule]) => key.startsWith(prefix) && rule.allowedRoles.includes(role))
    .map(([key]) => key.slice(prefix.length) as RRAction);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/rr-workflow.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rr-workflow.ts src/lib/rr-workflow.test.ts
git commit -m "feat: add R&R Award 6-step state machine"
```

---

### Task 3: R&R data access layer + COMPLETE_RR gate (tested)

**Files:**
- Create: `src/db/rr.ts`
- Test: `src/db/rr.test.ts`
- Modify: `src/db/projects.ts`
- Modify: `src/db/projects.test.ts`

**Interfaces:**
- Consumes: `transitionRR`, `RRAction`, `RRStage` (Task 2); `rrStageHistory` table, `projects.rrStage` (Task 1)
- Produces:
  - `async function getRRStageWith(database, projectId): Promise<RRStage | null>`
  - `async function getRRHistoryWith(database, projectId)`
  - `async function applyRRTransitionWith(database, projectId, action, actorId, actorRole, note?): Promise<RRStage>`
  - Zero-arg convenience wrappers `getRRStage`, `getRRHistory`, `applyRRTransition` — used by Task 4's API routes.
  - **In `projects.ts`:** `applyProjectTransitionWith` now throws before attempting `COMPLETE_RR` unless `project.rrStage === "RR_AWARDED"`.

- [ ] **Step 1: Write the failing tests for `src/db/rr.ts`**

```ts
// src/db/rr.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/db/rr.test.ts`
Expected: FAIL — `Cannot find module './rr'`.

- [ ] **Step 3: Write `src/db/rr.ts`**

```ts
import { eq, asc } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import { projects, rrStageHistory } from "./schema";
import * as schema from "./schema";
import { transitionRR, type RRAction, type RRStage } from "@/lib/rr-workflow";
import type { Role } from "@/lib/workflow";

type Db = LibSQLDatabase<typeof schema>;

export async function getRRStageWith(
  database: Db,
  projectId: string
): Promise<RRStage | null> {
  const rows = await database.select().from(projects).where(eq(projects.id, projectId));
  return (rows[0]?.rrStage as RRStage | null) ?? null;
}

export async function getRRHistoryWith(database: Db, projectId: string) {
  return database
    .select()
    .from(rrStageHistory)
    .where(eq(rrStageHistory.projectId, projectId))
    .orderBy(asc(rrStageHistory.createdAt));
}

export async function applyRRTransitionWith(
  database: Db,
  projectId: string,
  action: RRAction,
  actorId: string,
  actorRole: Role,
  note?: string
): Promise<RRStage> {
  const rows = await database.select().from(projects).where(eq(projects.id, projectId));
  const project = rows[0];
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  const currentStage = (project.rrStage as RRStage | null) ?? null;
  const nextStage = transitionRR(currentStage, action, actorRole);
  const now = new Date();
  await database
    .update(projects)
    .set({ rrStage: nextStage })
    .where(eq(projects.id, projectId));
  await database.insert(rrStageHistory).values({
    id: crypto.randomUUID(),
    projectId,
    fromStage: currentStage,
    toStage: nextStage,
    action,
    actorId,
    actorRole,
    note: note ?? null,
    createdAt: now,
  });
  return nextStage;
}

export const getRRStage = (projectId: string) => getRRStageWith(defaultDb, projectId);
export const getRRHistory = (projectId: string) => getRRHistoryWith(defaultDb, projectId);
export const applyRRTransition = (
  projectId: string,
  action: RRAction,
  actorId: string,
  actorRole: Role,
  note?: string
) => applyRRTransitionWith(defaultDb, projectId, action, actorId, actorRole, note);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/db/rr.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Add the `COMPLETE_RR` gate to `src/db/projects.ts`**

Open `src/db/projects.ts`. In `applyProjectTransitionWith`, insert this check immediately after the `if (!project)` block and before `const nextStage = transitionProject(...)`:

```ts
  if (action === "COMPLETE_RR" && project.rrStage !== "RR_AWARDED") {
    throw new Error(
      `R&R Award workflow is not complete yet (current R&R stage: ${
        project.rrStage ?? "not started"
      })`
    );
  }
```

- [ ] **Step 6: Update `src/db/projects.test.ts` for the new column and add the gate test**

Change the `CREATE TABLE projects` statement's last column list to include `rr_stage`:

```sql
      geometry_type TEXT, geometry_geo_json TEXT, rr_stage TEXT
```

Add `eq` to the existing `drizzle-orm` import at the top of the file:

```ts
import { sql, eq } from "drizzle-orm";
```

Append this test to the `describe("projects data layer", ...)` block:

```ts
  it("rejects COMPLETE_RR until the R&R sub-workflow reaches RR_AWARDED, then allows it", async () => {
    const { createProjectWith, applyProjectTransitionWith } = await import("./projects");
    const id = await createProjectWith(testDb, {
      name: "Test Bridge",
      purpose: "Testing",
      state: "Odisha",
      district: "Koraput",
      createdBy: "u-agency-1",
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
```

- [ ] **Step 7: Run the full projects and rr test files**

Run: `npx vitest run src/db/projects.test.ts src/db/rr.test.ts`
Expected: PASS — 7 tests in `projects.test.ts` (6 existing + 1 new), 4 in `rr.test.ts`.

- [ ] **Step 8: Commit**

```bash
git add src/db/rr.ts src/db/rr.test.ts src/db/projects.ts src/db/projects.test.ts
git commit -m "feat: add R&R data access layer and gate COMPLETE_RR on RR_AWARDED"
```

---

### Task 4: R&R API route

**Files:**
- Create: `src/app/api/projects/[id]/rr/route.ts`

**Interfaces:**
- Consumes: `getRRStage`, `getRRHistory`, `applyRRTransition` (Task 3); `getSession`, `can` (existing)
- Produces:
  - `GET /api/projects/[id]/rr` -> `{ stage: RRStage | null, history: RRStageHistoryEntry[] }`
  - `POST /api/projects/[id]/rr` -> body `{ action: RRAction, note?: string }` -> `{ stage: RRStage }`, 200 (400 on an invalid transition, 403 if the role can't perform it, reusing the existing `"project:transition"` coarse permission the same way the main transition route does — `rr-workflow.ts`'s per-action `allowedRoles` is the fine gate)

- [ ] **Step 1: Write `src/app/api/projects/[id]/rr/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getRRStage, getRRHistory, applyRRTransition } from "@/db/rr";
import type { RRAction } from "@/lib/rr-workflow";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const [stage, history] = await Promise.all([getRRStage(id), getRRHistory(id)]);
  return NextResponse.json({ stage, history });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "project:transition")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json()) as { action?: RRAction; note?: string };
  if (!body.action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }
  try {
    const stage = await applyRRTransition(id, body.action, session.userId, session.role, body.note);
    return NextResponse.json({ stage });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
```

- [ ] **Step 2: Manually verify the full flow, then re-verify the COMPLETE_RR gate**

```bash
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
npm run dev > /tmp/nextdev-rr.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'

login() {
  curl -s -c /tmp/c.txt -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" -d "{\"userId\":\"$1\"}" > /dev/null
}
transition() {
  curl -s -b /tmp/c.txt -X POST http://localhost:3000/api/projects/p-demo-bridge-1/transition \
    -H "Content-Type: application/json" -d "{\"action\":\"$1\"}"
  echo ""
}
rr_action() {
  curl -s -i -b /tmp/c.txt -X POST http://localhost:3000/api/projects/p-demo-bridge-1/rr \
    -H "Content-Type: application/json" -d "{\"action\":\"$1\",\"note\":\"$2\"}"
  echo ""
}

login u-district-1
transition APPROVE
transition COMPLETE
login u-state-1
transition STATE_APPROVE
login u-central-1
transition CENTRAL_APPROVE
login u-district-1
transition PUBLISH_DECLARATION
transition PASS_AWARD
transition START_RR

echo "--- COMPLETE_RR before any R&R step (expect 400) ---"
transition COMPLETE_RR

echo "--- R&R steps 1-4 (district) ---"
rr_action COMPLETE_SURVEY "312 affected families surveyed"
rr_action COMPLETE_SCHEME "Entitlements listed for 312 families"
rr_action COMPLETE_HEARING "Objection window closed, hearing held 2026-09-10"
rr_action SUBMIT_TO_COLLECTOR "Report on 4 objections submitted"

echo "--- R&R step 5 (state) ---"
login u-state-1
rr_action APPROVE_RR_SCHEME "Committee and Commissioner approved"

echo "--- R&R step 6 (district) ---"
login u-district-1
rr_action PASS_RR_AWARD "Section 19 declaration published, award passed"

echo "--- GET R&R state ---"
curl -s -b /tmp/c.txt http://localhost:3000/api/projects/p-demo-bridge-1/rr

echo "--- COMPLETE_RR now (expect success -> POSSESSION) ---"
transition COMPLETE_RR
```

Note: this reuses `p-demo-bridge-1`, which prior plans' manual verification may have already advanced partway. If a transition 400s because the project is already past that stage, that's expected — check current stage via `GET /api/projects` and skip ahead to whichever step is valid.

Expected: the first `COMPLETE_RR` attempt returns 400 with a message naming the R&R workflow as incomplete; each `rr_action` call returns 200 with the next stage; the GET shows `stage: "RR_AWARDED"` and 6 history entries; the final `COMPLETE_RR` returns 200 with `{"stage":"POSSESSION"}`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/projects/[id]/rr"
git commit -m "feat: add R&R Award workflow API route"
```

---

### Task 5: R&R panel on the project detail page

**Files:**
- Create: `src/components/rr-panel.tsx`
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `getRRStage`, `getRRHistory` (Task 3); `getAvailableRRActions`, `RRAction`, `RRStage`, `RR_STAGES` (Task 2); `Card`, `CardContent`, `Badge`, `Button`, `Textarea`, `Label` (UI foundation plan)
- Produces: a "Rehabilitation & Resettlement" section, visible once the project has reached `RR_IN_PROGRESS` or later, showing the 6 steps as a checklist with per-step actor/note history and a role-gated action for the current step.

No automated test — same rationale as prior UI-only tasks (`compensation-panel.tsx`, `document-upload.tsx`). Verified manually.

- [ ] **Step 1: Write `src/components/rr-panel.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RR_STAGES, type RRAction, type RRStage } from "@/lib/rr-workflow";
import type { Role } from "@/lib/workflow";

const RR_STEP_LABELS: Record<RRStage, string> = {
  SURVEYED: "1. Survey of affected families",
  SCHEME_DRAFTED: "2. R&R Scheme drafted",
  PUBLISHED: "3. Published locally, objection window and public hearing complete",
  SUBMITTED_TO_COLLECTOR: "4. Draft scheme and objections report submitted to Collector",
  COMMITTEE_APPROVED: "5. Committee and Commissioner R&R approval obtained",
  RR_AWARDED: "6. Final R&R Award passed, benefits paid",
};

const RR_STEP_ROLE: Record<RRStage, Role> = {
  SURVEYED: "district",
  SCHEME_DRAFTED: "district",
  PUBLISHED: "district",
  SUBMITTED_TO_COLLECTOR: "district",
  COMMITTEE_APPROVED: "state",
  RR_AWARDED: "district",
};

interface RRHistoryEntry {
  toStage: string;
  actorRole: string;
  note: string | null;
  createdAt: string | Date;
}

export function RRPanel({
  projectId,
  stage,
  history,
  availableActions,
}: {
  projectId: string;
  stage: RRStage | null;
  history: RRHistoryEntry[];
  availableActions: RRAction[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function perform(event: FormEvent<HTMLFormElement>, action: RRAction) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const note = formData.get("note");
    const res = await fetch(`/api/projects/${projectId}/rr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: note ? String(note) : undefined }),
    });
    const body = (await res.json()) as { error?: string; stage?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "R&R step failed");
      return;
    }
    toast.success(`R&R advanced to ${body.stage}`);
    router.refresh();
  }

  const completedIndex = stage ? RR_STAGES.indexOf(stage) : -1;
  const nextStage = completedIndex + 1 < RR_STAGES.length ? RR_STAGES[completedIndex + 1] : null;
  const historyByStage = new Map(history.map((h) => [h.toStage, h]));

  return (
    <div className="space-y-2">
      {RR_STAGES.map((step, i) => {
        const entry = historyByStage.get(step);
        const isDone = i <= completedIndex;
        const isNext = step === nextStage;
        return (
          <Card key={step}>
            <CardContent className="flex flex-col gap-2 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{RR_STEP_LABELS[step]}</span>
                <Badge
                  variant="outline"
                  className={
                    isDone
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-dashed text-muted-foreground/60"
                  }
                >
                  {isDone ? "Complete" : "Pending"}
                </Badge>
              </div>
              {entry && (
                <p className="text-xs text-muted-foreground">
                  {entry.actorRole} on {new Date(entry.createdAt).toLocaleString()}
                  {entry.note ? ` — ${entry.note}` : ""}
                </p>
              )}
              {isNext &&
                (availableActions.length > 0 ? (
                  <form
                    onSubmit={(e) => perform(e, availableActions[0])}
                    className="flex items-end gap-2 pt-1"
                  >
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Note (optional)</Label>
                      <Textarea name="note" rows={1} className="min-h-8" />
                    </div>
                    <Button type="submit" size="sm" disabled={pending}>
                      {pending ? "Working..." : "Complete this step"}
                    </Button>
                  </form>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Needs a {RR_STEP_ROLE[step]}-role action to proceed.
                  </p>
                ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the project detail page**

Open `src/app/(dashboard)/projects/[id]/page.tsx`. Add these imports:

```ts
import { getRRStage, getRRHistory } from "@/db/rr";
import { getAvailableRRActions } from "@/lib/rr-workflow";
import { RRPanel } from "@/components/rr-panel";
```

The file already has `import { getAvailableActions, STAGES, type Stage } from "@/lib/workflow";` — reuse that existing `STAGES` import directly below (it is the project workflow's stage list, distinct from `RR_STAGES` which is only used inside `rr-panel.tsx`, so there is no naming clash to alias).

Add this alongside the existing data fetches (after `compensationByParcel`/`parcelsWithCompensation` computation, before the `return`):

```ts
  const showRRPanel = STAGES.indexOf(currentStage) >= STAGES.indexOf("RR_IN_PROGRESS");
  const rrStage = showRRPanel ? await getRRStage(id) : null;
  const rrHistory = showRRPanel ? await getRRHistory(id) : [];
  const rrAvailableActions = showRRPanel ? getAvailableRRActions(rrStage, session.role) : [];
```

Add this section after the Compensation `<div>` (and before the History `<div>`):

```tsx
      {showRRPanel && (
        <div>
          <h3 className="mb-2 text-sm font-medium">Rehabilitation &amp; Resettlement</h3>
          <RRPanel
            projectId={project.id}
            stage={rrStage}
            history={rrHistory}
            availableActions={rrAvailableActions}
          />
        </div>
      )}
```

- [ ] **Step 3: Manually verify**

```bash
curl -s -b /tmp/c.txt http://localhost:3000/projects/p-demo-bridge-1 -o /tmp/detail-rr.html
grep -o "Rehabilitation" /tmp/detail-rr.html
grep -aiE "error" /tmp/nextdev-rr.log | grep -v "Warning: Next.js ignored package-lock"
npx tsc --noEmit
```

Expected: "Rehabilitation" found (the project reached `RR_IN_PROGRESS` or later during Task 4's manual verification), no server errors, `tsc` clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/rr-panel.tsx "src/app/(dashboard)/projects/[id]/page.tsx"
git commit -m "feat: add R&R Award workflow panel to project detail page"
```

---

### Task 6: Full regression check

**Files:** none — verification only.

- [ ] **Step 1: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass (prior suite + this plan's new tests: 9 in `rr-workflow.test.ts`, 4 in `rr.test.ts`, 1 new in `projects.test.ts`).

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Stop the dev server left running from manual verification**

```bash
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
```

---

## What this plan does not cover

- Second/Third Schedule entitlement and infrastructure tracking, versioned entitlement rates, dispute/appeal workflow (parent spec Section 6.2, deferred)
- Mock PFMS/bank disbursement trail
- Any change to the compensation, documents, or GIS modules beyond what the UI foundation plan already restyled
