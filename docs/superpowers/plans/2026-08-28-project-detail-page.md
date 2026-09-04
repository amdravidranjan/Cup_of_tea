# Project Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every project a real detail page — stage indicator, role-filtered action buttons for the current stage, and the audit trail — so the dashboard's project list is actually clickable and the workflow engine built in the foundation plan has a UI surface.

**Architecture:** Extends the existing foundation (workflow state machine, RBAC, projects data layer) with one new pure query (`getAvailableActions`), one new data-layer query (`getStageHistory`), a server-component detail page, and a small client component for the action buttons. No new external dependencies, no schema changes. Styling stays at the same bare-Tailwind-utility level as the foundation plan — a dedicated design pass is a separate, explicitly deferred decision (2026-08-28).

**Tech Stack:** Same as foundation plan — Next.js 16 App Router, Drizzle ORM over libsql, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md` (Section 5 "Core Workflow", Section 7 UX "persistent breadcrumb + stage indicator", Section 6.9 "full audit log on every record")

## Global Constraints

- Same as the foundation plan's Global Constraints (`docs/superpowers/plans/2026-08-28-foundation-workflow-engine.md`): RBAC enforced server-side, immutable audit trail, single Next.js monolith, DB/auth remain the stubbed SQLite/mock-session setup.
- Action buttons shown to a user must be **only the actions that role can actually perform from the project's current stage** — never render a button that will 403/400 if clicked. This is what `getAvailableActions` exists to guarantee.

---

### Task 1: `getAvailableActions` query (pure, tested)

**Files:**
- Modify: `src/lib/workflow.ts`
- Modify: `src/lib/workflow.test.ts`

**Interfaces:**
- Consumes: the existing (unexported) `TRANSITIONS` table in `workflow.ts`
- Produces: `function getAvailableActions(stage: Stage, role: Role): Action[]` — returns, in the transition table's definition order, every action `role` is allowed to perform from `stage`. Empty array for a terminal stage or a role with no valid actions there. Used by the detail page (Task 3) to decide which buttons to render.

- [ ] **Step 1: Add the failing tests** (append to the existing `describe("transitionProject", ...)` file — add a new `describe` block)

```ts
import { getAvailableActions } from "./workflow";

describe("getAvailableActions", () => {
  it("returns SUBMIT for both agency and district on DRAFT", () => {
    expect(getAvailableActions("DRAFT", "agency")).toEqual(["SUBMIT"]);
    expect(getAvailableActions("DRAFT", "district")).toEqual(["SUBMIT"]);
  });

  it("returns nothing for a role with no valid action at that stage", () => {
    expect(getAvailableActions("DRAFT", "state")).toEqual([]);
  });

  it("returns both APPROVE and REJECT for district on SCRUTINY", () => {
    expect(getAvailableActions("SCRUTINY", "district")).toEqual(["APPROVE", "REJECT"]);
  });

  it("returns nothing at the terminal stage", () => {
    expect(getAvailableActions("RR_COMPLETE", "district")).toEqual([]);
  });
});
```

(Add the `getAvailableActions` import to the existing `import { transitionProject, STAGES, type Role } from "./workflow";` line at the top of the file rather than a second import line.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/workflow.test.ts`
Expected: FAIL — `getAvailableActions is not a function` (or not exported).

- [ ] **Step 3: Implement in `src/lib/workflow.ts`**

Add this function after `transitionProject`:

```ts
export function getAvailableActions(stage: Stage, role: Role): Action[] {
  const prefix = `${stage}:`;
  return Object.entries(TRANSITIONS)
    .filter(([key, rule]) => key.startsWith(prefix) && rule.allowedRoles.includes(role))
    .map(([key]) => key.slice(prefix.length) as Action);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/workflow.test.ts`
Expected: PASS, 11 tests (7 existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/workflow.ts src/lib/workflow.test.ts
git commit -m "feat: add getAvailableActions query to workflow engine"
```

---

### Task 2: `getStageHistory` query (tested against in-memory DB)

**Files:**
- Modify: `src/db/projects.ts`
- Modify: `src/db/projects.test.ts`

**Interfaces:**
- Consumes: `stageHistory` table (already imported in `projects.ts`)
- Produces: `async function getStageHistoryWith(database: Db, projectId: string)` and its `getStageHistory(projectId)` convenience wrapper (same `...With` pattern as the rest of the file) — returns all history rows for a project **in ascending chronological order**. Used by the detail page (Task 3).

- [ ] **Step 1: Add the failing test** (append to the existing `describe("projects data layer", ...)` block)

```ts
it("returns stage history in chronological order", async () => {
  const { createProjectWith, applyProjectTransitionWith, getStageHistoryWith } =
    await import("./projects");
  const id = await createProjectWith(testDb, {
    name: "Test Bridge",
    purpose: "Testing",
    state: "Odisha",
    district: "Koraput",
    createdBy: "u-agency-1",
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
```

- [ ] **Step 2: Run tests to verify the new test fails**

Run: `npx vitest run src/db/projects.test.ts`
Expected: FAIL — `getStageHistoryWith is not a function`.

- [ ] **Step 3: Implement in `src/db/projects.ts`**

Add `asc` to the existing `import { eq } from "drizzle-orm";` line (making it `import { eq, asc } from "drizzle-orm";`), then add after `getProjectWith`:

```ts
export async function getStageHistoryWith(database: Db, projectId: string) {
  return database
    .select()
    .from(stageHistory)
    .where(eq(stageHistory.projectId, projectId))
    .orderBy(asc(stageHistory.createdAt));
}
```

And add alongside the other convenience wrappers near the bottom of the file:

```ts
export const getStageHistory = (projectId: string) =>
  getStageHistoryWith(defaultDb, projectId);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/db/projects.test.ts`
Expected: PASS, 5 tests (4 existing + 1 new).

- [ ] **Step 5: Commit**

```bash
git add src/db/projects.ts src/db/projects.test.ts
git commit -m "feat: add getStageHistory query for project audit trail"
```

---

### Task 3: Project detail page + action buttons

**Files:**
- Create: `src/components/project-actions.tsx`
- Create: `src/app/(dashboard)/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `getSession` (`@/lib/auth`), `getProject`/`getStageHistory` (`@/db/projects`), `getAvailableActions`/`STAGES`/`type Stage`/`type Action` (`@/lib/workflow`)
- Produces: the route `/projects/[id]`, rendering the project, a stage indicator across all 11 `STAGES`, role-filtered action buttons that POST to the existing `/api/projects/[id]/transition` route (built in the foundation plan — not modified here), and the chronological history list.

No automated test — same rationale as the foundation plan's UI task: this is presentation composition over already-tested data/logic, verified manually.

- [ ] **Step 1: Write `src/components/project-actions.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Action } from "@/lib/workflow";

export function ProjectActions({
  projectId,
  availableActions,
}: {
  projectId: string;
  availableActions: Action[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function perform(action: Action) {
    setPending(action);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      setError(body.error ?? "Transition failed");
      return;
    }
    router.refresh();
  }

  if (availableActions.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No actions available for your role at this stage.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {availableActions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => perform(action)}
            disabled={pending !== null}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            {pending === action ? "Working..." : action}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/app/(dashboard)/projects/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getProject, getStageHistory } from "@/db/projects";
import { getAvailableActions, STAGES, type Stage } from "@/lib/workflow";
import { ProjectActions } from "@/components/project-actions";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const history = await getStageHistory(id);
  const currentStage = project.stage as Stage;
  const availableActions = getAvailableActions(currentStage, session.role);
  const currentIndex = STAGES.indexOf(currentStage);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{project.name}</h2>
        <p className="text-sm text-gray-500">{project.purpose}</p>
        <p className="text-sm text-gray-500">
          {project.district}, {project.state}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Stage</h3>
        <ol className="flex flex-wrap gap-2 text-xs">
          {STAGES.map((stage, i) => (
            <li
              key={stage}
              className={
                i === currentIndex
                  ? "rounded-full bg-blue-600 px-2 py-1 text-white"
                  : i < currentIndex
                    ? "rounded-full bg-gray-300 px-2 py-1 text-gray-700"
                    : "rounded-full border border-gray-300 px-2 py-1 text-gray-400"
              }
            >
              {stage}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Actions</h3>
        <ProjectActions projectId={project.id} availableActions={availableActions} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">History</h3>
        <ul className="space-y-1 text-sm text-gray-600">
          {history.map((h) => (
            <li key={h.id}>
              {h.fromStage ?? "—"} → {h.toStage} ({h.action}) by {h.actorRole} on{" "}
              {h.createdAt.toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manually verify in the browser or via curl**

With `npm run dev` running and the DB seeded:

```bash
curl -s -c /tmp/c.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d '{"userId":"u-district-1"}' > /dev/null
curl -s -b /tmp/c.txt http://localhost:3000/projects/p-demo-bridge-1 | grep -o "Koraput River Bridge Project"
```

Expected: prints the project name, confirming the page renders for a logged-in district user without error. In a browser: the DRAFT stage pill is highlighted blue, earlier pills (none, since DRAFT is first) are gray, later pills are outlined; a "SUBMIT" button is visible (district is allowed `DRAFT:SUBMIT`); clicking it updates the stage pill to SCRUTINY and appends a new history row without a full page reload.

- [ ] **Step 4: Commit**

```bash
git add src/components/project-actions.tsx "src/app/(dashboard)/projects"
git commit -m "feat: add project detail page with stage actions and history"
```

---

### Task 4: Link the dashboard list to project detail pages

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `Link` from `next/link`
- Produces: each project row in the dashboard list becomes a link to `/projects/[id]` (Task 3's route).

- [ ] **Step 1: Update `src/app/(dashboard)/page.tsx`**

Add `import Link from "next/link";` at the top, and replace the `<p className="font-medium">{p.name}</p>` line inside the list item with:

```tsx
<Link href={`/projects/${p.id}`} className="font-medium hover:underline">
  {p.name}
</Link>
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`, open `http://localhost:3000`, select any role, click a project name in the list.
Expected: navigates to `/projects/<id>` and renders the detail page from Task 3.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/page.tsx"
git commit -m "feat: link dashboard project list to detail pages"
```

---

## What this plan does not cover

- Any visual design pass (explicitly deferred, 2026-08-28) — this reuses the same bare-Tailwind-utility level as the foundation plan.
- Document upload, GIS overlay, or compensation/R&R detail sections on this page — those are separate plans that will each add a section to this same detail page once built.
