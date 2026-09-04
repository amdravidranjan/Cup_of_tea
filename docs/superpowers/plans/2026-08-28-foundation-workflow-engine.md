# Foundation: Roles, Workflow Engine, and Project Data Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a real, persisted project-lifecycle state machine with role-gated transitions and an immutable audit trail, so every later module (GIS, compensation/R&R, dashboards, documents) has real projects and roles to attach to instead of mock data.

**Architecture:** Next.js 16 App Router monolith (already scaffolded). Persistence and auth are **stubbed for this plan** per explicit user decision: SQLite via `@libsql/client` + Drizzle ORM instead of Neon Postgres (same Drizzle API, trivial to re-point at a Postgres connection string later — no schema rewrite, just a different driver import), and a signed-cookie mock session instead of Clerk (same `getSession()`/role shape a real auth provider would populate, swappable behind one module). The mock-auth "pick a demo user" UI doubles as the demo role-switcher feature already scoped in the design doc's UX section (6/7).

**Tech Stack:** Next.js 16 (App Router, already installed), TypeScript, Drizzle ORM, `@libsql/client` (SQLite), Vitest, `tsx`.

**Spec:** `docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md` (Sections 4 "Roles & RBAC", 5 "Core Workflow", 6.1 "Core Lifecycle Workflow")

## Global Constraints

- RBAC must be enforced **server-side** (API route handlers), never only via hidden UI — spec Section 6.9.
- Every stage transition writes an **immutable audit record** (who, when, from-stage, to-stage, action) — spec Section 5.
- Single Next.js monolith — no separate backend service, no separate deploy — spec Section 3.3.
- Next.js 16 has breaking changes vs. older training data (per this repo's auto-generated `AGENTS.md`). Before writing any Next.js-specific code (route handlers, dynamic params, `cookies()`), check `node_modules/next/dist/docs/` for the current API shape if anything below looks off against what actually installs.
- DB and auth are intentionally **stubbed** this plan (user decision, 2026-08-28): no Neon, no Clerk. Do not add either without a new task/decision.

---

### Task 1: Project dependencies & test tooling

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `npm run test` (single run), `npm run test:watch` (watch mode) — every later task's tests run through these.

- [ ] **Step 1: Install runtime and dev dependencies**

```bash
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit vitest tsx
```

- [ ] **Step 2: Create `vitest.config.mts`** (`.mts`, not `.ts` — avoids an ESM/CJS config-loader warning since `package.json` has no `"type": "module"`)

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
  },
});
```

The `resolve.alias` entry is required — Vitest does not automatically honor the `@/*` path alias from `tsconfig.json` the way Next.js does; without it, any test file that imports through `@/...` (Task 7 does) fails with `Cannot find package '@/...'`.

- [ ] **Step 3: Add test scripts to `package.json`**

Add these entries to the `"scripts"` object (keep existing `dev`/`build`/`start`/`lint`):

```json
"test": "vitest run",
"test:watch": "vitest",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio",
"db:seed": "tsx src/db/seed.ts"
```

- [ ] **Step 4: Verify Vitest runs with no test files**

Run: `npm run test`
Expected: exits 0, reports "No test files found" (or equivalent) — confirms the runner is wired before any real tests exist.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add drizzle, libsql, and vitest tooling"
```

---

### Task 2: Database schema

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/client.ts`
- Create: `drizzle.config.ts`

**Interfaces:**
- Produces:
  - `users` table: `{ id: text, name: text, role: text, district: text|null, state: text|null }`
  - `projects` table: `{ id: text, name: text, purpose: text, state: text, district: text, stage: text, createdBy: text, createdAt: Date, updatedAt: Date }`
  - `stageHistory` table: `{ id: text, projectId: text, fromStage: text|null, toStage: text, action: text, actorId: text, actorRole: text, createdAt: Date }`
  - `db` — a configured Drizzle client, importable as `import { db } from "@/db/client"`

- [ ] **Step 1: Write `src/db/schema.ts`**

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  district: text("district"),
  state: text("state"),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  purpose: text("purpose").notNull(),
  state: text("state").notNull(),
  district: text("district").notNull(),
  stage: text("stage").notNull().default("DRAFT"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const stageHistory = sqliteTable("stage_history", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  fromStage: text("from_stage"),
  toStage: text("to_stage").notNull(),
  action: text("action").notNull(),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

- [ ] **Step 2: Write `src/db/client.ts`**

```ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:local.db",
});

export const db = drizzle(client, { schema });
```

- [ ] **Step 3: Write `drizzle.config.ts`** (project root)

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:local.db",
  },
});
```

- [ ] **Step 4: Add `local.db*` and `drizzle/` to `.gitignore`**

Append to `.gitignore`:

```
# local dev database
local.db
local.db-*
/drizzle
```

- [ ] **Step 5: Push schema to local dev DB and verify**

Run: `npm run db:push`
Expected: completes without error, creates `local.db` in the project root with `users`, `projects`, `stage_history` tables.

Verify by running: `npx tsx -e "import('./src/db/client.ts').then(async ({db}) => { const {users} = await import('./src/db/schema.ts'); console.log(await db.select().from(users)); })"`
Expected: prints `[]` (empty array — table exists, no rows yet).

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/db/client.ts drizzle.config.ts .gitignore
git commit -m "feat: add database schema for users, projects, stage history"
```

---

### Task 3: Workflow state machine (pure, tested)

**Files:**
- Create: `src/lib/workflow.ts`
- Test: `src/lib/workflow.test.ts`

**Interfaces:**
- Consumes: nothing (pure module, no DB/auth dependency)
- Produces:
  - `type Stage = "DRAFT" | "SCRUTINY" | "SIA" | "NOTIFIED" | "STATE_APPROVED" | "CENTRAL_APPROVED" | "DECLARED" | "AWARDED" | "RR_IN_PROGRESS" | "POSSESSION" | "RR_COMPLETE"`
  - `type Action = "SUBMIT" | "APPROVE" | "REJECT" | "COMPLETE" | "STATE_APPROVE" | "STATE_REJECT" | "CENTRAL_APPROVE" | "CENTRAL_REJECT" | "PUBLISH_DECLARATION" | "PASS_AWARD" | "START_RR" | "COMPLETE_RR" | "COMPLETE_INFRASTRUCTURE"`
  - `function transitionProject(current: Stage, action: Action, actorRole: Role): Stage` — throws `Error` with a human-readable message on an invalid action for the current stage, or on a role that isn't permitted to perform it. Used by `src/db/projects.ts` (Task 7).
  - `STAGES: Stage[]` — ordered list of all stages, for UI stage-indicator rendering later.

This task also depends on the `Role` type, which is defined in Task 4 (`src/lib/rbac.ts`). To keep this task self-contained and buildable first, define `Role` locally here and re-export it; Task 4 will import it from here rather than redefining it.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/workflow.test.ts
import { describe, it, expect } from "vitest";
import { transitionProject, STAGES, type Role } from "./workflow";

describe("transitionProject", () => {
  it("moves DRAFT to SCRUTINY on SUBMIT by an agency", () => {
    expect(transitionProject("DRAFT", "SUBMIT", "agency")).toBe("SCRUTINY");
  });

  it("moves SCRUTINY to SIA on APPROVE by district", () => {
    expect(transitionProject("SCRUTINY", "APPROVE", "district")).toBe("SIA");
  });

  it("moves SCRUTINY back to DRAFT on REJECT by district", () => {
    expect(transitionProject("SCRUTINY", "REJECT", "district")).toBe("DRAFT");
  });

  it("rejects an action not valid for the current stage", () => {
    expect(() => transitionProject("DRAFT", "PASS_AWARD", "district")).toThrow(
      /no transition/i
    );
  });

  it("rejects an actor whose role cannot perform the action", () => {
    expect(() => transitionProject("DRAFT", "SUBMIT", "field" as Role)).toThrow(
      /role/i
    );
  });

  it("walks the full happy path from DRAFT to RR_COMPLETE", () => {
    let stage = transitionProject("DRAFT", "SUBMIT", "agency");
    stage = transitionProject(stage, "APPROVE", "district");
    stage = transitionProject(stage, "COMPLETE", "district");
    stage = transitionProject(stage, "STATE_APPROVE", "state");
    stage = transitionProject(stage, "CENTRAL_APPROVE", "central");
    stage = transitionProject(stage, "PUBLISH_DECLARATION", "district");
    stage = transitionProject(stage, "PASS_AWARD", "district");
    stage = transitionProject(stage, "START_RR", "district");
    stage = transitionProject(stage, "COMPLETE_RR", "district");
    stage = transitionProject(stage, "COMPLETE_INFRASTRUCTURE", "district");
    expect(stage).toBe("RR_COMPLETE");
  });

  it("STAGES lists all 11 stages in order starting with DRAFT", () => {
    expect(STAGES[0]).toBe("DRAFT");
    expect(STAGES).toHaveLength(11);
    expect(STAGES[STAGES.length - 1]).toBe("RR_COMPLETE");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/workflow.test.ts`
Expected: FAIL — `Cannot find module './workflow'` (file doesn't exist yet).

- [ ] **Step 3: Write `src/lib/workflow.ts`**

```ts
export type Role = "district" | "state" | "central" | "agency" | "field";

export type Stage =
  | "DRAFT"
  | "SCRUTINY"
  | "SIA"
  | "NOTIFIED"
  | "STATE_APPROVED"
  | "CENTRAL_APPROVED"
  | "DECLARED"
  | "AWARDED"
  | "RR_IN_PROGRESS"
  | "POSSESSION"
  | "RR_COMPLETE";

export type Action =
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "COMPLETE"
  | "STATE_APPROVE"
  | "STATE_REJECT"
  | "CENTRAL_APPROVE"
  | "CENTRAL_REJECT"
  | "PUBLISH_DECLARATION"
  | "PASS_AWARD"
  | "START_RR"
  | "COMPLETE_RR"
  | "COMPLETE_INFRASTRUCTURE";

export const STAGES: Stage[] = [
  "DRAFT",
  "SCRUTINY",
  "SIA",
  "NOTIFIED",
  "STATE_APPROVED",
  "CENTRAL_APPROVED",
  "DECLARED",
  "AWARDED",
  "RR_IN_PROGRESS",
  "POSSESSION",
  "RR_COMPLETE",
];

interface TransitionRule {
  next: Stage;
  allowedRoles: Role[];
}

const TRANSITIONS: Record<string, TransitionRule> = {
  "DRAFT:SUBMIT": { next: "SCRUTINY", allowedRoles: ["agency", "district"] },
  "SCRUTINY:APPROVE": { next: "SIA", allowedRoles: ["district"] },
  "SCRUTINY:REJECT": { next: "DRAFT", allowedRoles: ["district"] },
  "SIA:COMPLETE": { next: "NOTIFIED", allowedRoles: ["district"] },
  "SIA:REJECT": { next: "DRAFT", allowedRoles: ["district"] },
  "NOTIFIED:STATE_APPROVE": { next: "STATE_APPROVED", allowedRoles: ["state"] },
  "NOTIFIED:STATE_REJECT": { next: "SCRUTINY", allowedRoles: ["state"] },
  "STATE_APPROVED:CENTRAL_APPROVE": {
    next: "CENTRAL_APPROVED",
    allowedRoles: ["central"],
  },
  "STATE_APPROVED:CENTRAL_REJECT": { next: "SCRUTINY", allowedRoles: ["central"] },
  "CENTRAL_APPROVED:PUBLISH_DECLARATION": {
    next: "DECLARED",
    allowedRoles: ["district"],
  },
  "DECLARED:PASS_AWARD": { next: "AWARDED", allowedRoles: ["district"] },
  "AWARDED:START_RR": { next: "RR_IN_PROGRESS", allowedRoles: ["district"] },
  "RR_IN_PROGRESS:COMPLETE_RR": { next: "POSSESSION", allowedRoles: ["district"] },
  "POSSESSION:COMPLETE_INFRASTRUCTURE": {
    next: "RR_COMPLETE",
    allowedRoles: ["district"],
  },
};

export function transitionProject(
  current: Stage,
  action: Action,
  actorRole: Role
): Stage {
  const key = `${current}:${action}`;
  const rule = TRANSITIONS[key];
  if (!rule) {
    throw new Error(`No transition for action "${action}" from stage "${current}"`);
  }
  if (!rule.allowedRoles.includes(actorRole)) {
    throw new Error(
      `Role "${actorRole}" cannot perform "${action}" from stage "${current}"`
    );
  }
  return rule.next;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/workflow.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/workflow.ts src/lib/workflow.test.ts
git commit -m "feat: add project workflow state machine"
```

---

### Task 4: RBAC module (pure, tested)

**Files:**
- Create: `src/lib/rbac.ts`
- Test: `src/lib/rbac.test.ts`

**Interfaces:**
- Consumes: `Role` from `src/lib/workflow.ts` (Task 3)
- Produces:
  - `type Permission = "project:create" | "project:view:own" | "project:view:all" | "project:transition"`
  - `function can(role: Role, permission: Permission): boolean` — used by API routes in Tasks 5 and 8.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/rbac.test.ts
import { describe, it, expect } from "vitest";
import { can } from "./rbac";

describe("can", () => {
  it("allows agency to create projects", () => {
    expect(can("agency", "project:create")).toBe(true);
  });

  it("allows agency to attempt transitions (workflow.ts restricts which ones)", () => {
    expect(can("agency", "project:transition")).toBe(true);
  });

  it("allows district to transition projects", () => {
    expect(can("district", "project:transition")).toBe(true);
  });

  it("allows state to view all projects but not create them", () => {
    expect(can("state", "project:view:all")).toBe(true);
    expect(can("state", "project:create")).toBe(false);
  });

  it("allows field officers to view only their own projects", () => {
    expect(can("field", "project:view:own")).toBe(true);
    expect(can("field", "project:view:all")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/rbac.test.ts`
Expected: FAIL — `Cannot find module './rbac'`.

- [ ] **Step 3: Write `src/lib/rbac.ts`**

```ts
import type { Role } from "./workflow";

export type Permission =
  | "project:create"
  | "project:view:own"
  | "project:view:all"
  | "project:transition";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // "project:transition" here is the coarse gate ("can this role attempt
  // any transition endpoint at all"); workflow.ts's per-action allowedRoles
  // is the fine gate that actually restricts agency to DRAFT:SUBMIT only.
  agency: ["project:create", "project:view:own", "project:transition"],
  district: ["project:create", "project:view:own", "project:transition"],
  state: ["project:view:all", "project:transition"],
  central: ["project:view:all", "project:transition"],
  field: ["project:view:own"],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/rbac.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rbac.ts src/lib/rbac.test.ts
git commit -m "feat: add role-based permission checks"
```

---

### Task 5: Mock auth (session cookie) + demo users + login/logout routes

**Files:**
- Create: `src/db/seed-data.ts`
- Create: `src/lib/auth.ts`
- Test: `src/lib/auth.test.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`

**Interfaces:**
- Consumes: `Role` from `src/lib/workflow.ts`
- Produces:
  - `DEMO_USERS: DemoUser[]` where `DemoUser = { id: string; name: string; role: Role; district?: string; state?: string }` — used by the seed script (Task 6) and the role-switcher UI (Task 9).
  - `interface Session { userId: string; name: string; role: Role }`
  - `SESSION_COOKIE: string` — the cookie name.
  - `function parseSessionCookie(raw: string | undefined): Session | null` — pure, tested.
  - `async function getSession(): Promise<Session | null>` — used by every protected route/page from here on.
  - `async function setSession(session: Session): Promise<void>`
  - `async function clearSession(): Promise<void>`
  - `POST /api/auth/login` — body `{ userId: string }`, sets the session cookie for a known demo user.
  - `POST /api/auth/logout` — clears the session cookie.

- [ ] **Step 1: Write `src/db/seed-data.ts`** (no test needed — static data)

```ts
import type { Role } from "@/lib/workflow";

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  district?: string;
  state?: string;
}

export const DEMO_USERS: DemoUser[] = [
  { id: "u-central-1", name: "Priya Sharma (DoLR, Central)", role: "central" },
  {
    id: "u-state-1",
    name: "Anil Kumar (State Govt, Odisha)",
    role: "state",
    state: "Odisha",
  },
  {
    id: "u-district-1",
    name: "Sub-Collector, Koraput",
    role: "district",
    state: "Odisha",
    district: "Koraput",
  },
  { id: "u-agency-1", name: "NHAI Project Office", role: "agency" },
  {
    id: "u-field-1",
    name: "Field Verification Officer, Koraput",
    role: "field",
    state: "Odisha",
    district: "Koraput",
  },
];
```

- [ ] **Step 2: Write the failing tests for `parseSessionCookie`**

```ts
// src/lib/auth.test.ts
import { describe, it, expect } from "vitest";
import { parseSessionCookie } from "./auth";

describe("parseSessionCookie", () => {
  it("returns null for undefined input", () => {
    expect(parseSessionCookie(undefined)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseSessionCookie("not json")).toBeNull();
  });

  it("returns null when required fields are missing", () => {
    expect(parseSessionCookie(JSON.stringify({ userId: "u-1" }))).toBeNull();
  });

  it("parses a valid session", () => {
    const raw = JSON.stringify({ userId: "u-1", name: "Test User", role: "district" });
    expect(parseSessionCookie(raw)).toEqual({
      userId: "u-1",
      name: "Test User",
      role: "district",
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: FAIL — `Cannot find module './auth'`.

- [ ] **Step 4: Write `src/lib/auth.ts`**

```ts
import { cookies } from "next/headers";
import type { Role } from "./workflow";

export interface Session {
  userId: string;
  name: string;
  role: Role;
}

export const SESSION_COOKIE = "demo_session";

export function parseSessionCookie(raw: string | undefined): Session | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.userId === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.role === "string"
    ) {
      return parsed as Session;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return parseSessionCookie(store.get(SESSION_COOKIE)?.value);
}

export async function setSession(session: Session): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Write `src/app/api/auth/login/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { DEMO_USERS } from "@/db/seed-data";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { userId?: string };
  const user = DEMO_USERS.find((u) => u.id === body.userId);
  if (!user) {
    return NextResponse.json({ error: "Unknown demo user" }, { status: 400 });
  }
  await setSession({ userId: user.id, name: user.name, role: user.role });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Write `src/app/api/auth/logout/route.ts`**

```ts
import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 8: Manually verify the login route**

Run: `npm run dev` (in one terminal), then in another:

```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"u-district-1"}'
```

Expected: `HTTP/1.1 200 OK`, JSON body `{"ok":true}`, and a `Set-Cookie: demo_session=...` header in the response.

- [ ] **Step 9: Commit**

```bash
git add src/db/seed-data.ts src/lib/auth.ts src/lib/auth.test.ts src/app/api/auth
git commit -m "feat: add mock session auth with demo users"
```

---

### Task 6: Seed script

**Files:**
- Create: `src/db/seed.ts`

**Interfaces:**
- Consumes: `db` (Task 2), `users`/`projects`/`stageHistory` (Task 2), `DEMO_USERS` (Task 5)
- Produces: a runnable script (`npm run db:seed`) that populates `local.db` with demo users and one demo project. Later tasks (7, 9) assume this has been run at least once in dev.

- [ ] **Step 1: Write `src/db/seed.ts`**

```ts
import { db } from "./client";
import { users, projects, stageHistory } from "./schema";
import { DEMO_USERS } from "./seed-data";

async function main() {
  for (const user of DEMO_USERS) {
    await db
      .insert(users)
      .values({
        id: user.id,
        name: user.name,
        role: user.role,
        district: user.district ?? null,
        state: user.state ?? null,
      })
      .onConflictDoNothing();
  }

  const now = new Date();
  const projectId = "p-demo-bridge-1";

  await db
    .insert(projects)
    .values({
      id: projectId,
      name: "Koraput River Bridge Project",
      purpose: "Construction of a 2-lane bridge connecting Koraput town to NH-26",
      state: "Odisha",
      district: "Koraput",
      stage: "DRAFT",
      createdBy: "u-agency-1",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  await db.insert(stageHistory).values({
    id: crypto.randomUUID(),
    projectId,
    fromStage: null,
    toStage: "DRAFT",
    action: "CREATE",
    actorId: "u-agency-1",
    actorRole: "agency",
    createdAt: now,
  });

  console.log("Seed complete: 5 demo users, 1 demo project.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the seed script**

Run: `npm run db:seed`
Expected: prints `Seed complete: 5 demo users, 1 demo project.` with no errors.

- [ ] **Step 3: Verify seeded data**

Run: `npm run db:studio` and open the printed local URL, or run:

```bash
npx tsx -e "import('./src/db/client.ts').then(async ({db}) => { const {projects} = await import('./src/db/schema.ts'); console.log(await db.select().from(projects)); })"
```

Expected: one row, `name: "Koraput River Bridge Project"`, `stage: "DRAFT"`.

- [ ] **Step 4: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: add database seed script with demo users and sample project"
```

---

### Task 7: Projects data access layer (tested against in-memory DB)

**Files:**
- Create: `src/db/projects.ts`
- Test: `src/db/projects.test.ts`

**Interfaces:**
- Consumes: `transitionProject`, `Stage`, `Action`, `Role` from `src/lib/workflow.ts`
- Produces:
  - `interface CreateProjectInput { name: string; purpose: string; state: string; district: string; createdBy: string }`
  - `async function createProject(input: CreateProjectInput): Promise<string>` — returns new project id
  - `async function listProjects(): Promise<Project[]>`
  - `async function getProject(id: string): Promise<Project | null>`
  - `async function applyProjectTransition(projectId: string, action: Action, actorId: string, actorRole: Role): Promise<Stage>` — throws on invalid transition (propagated from `transitionProject`) or unknown project id. Used by the transition API route in Task 8.

This task's tests use a **separate in-memory libsql database** (`:memory:`), not the shared `local.db`, so they don't depend on or pollute seeded dev data.

- [ ] **Step 1: Write the failing tests**

```ts
// src/db/projects.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// Re-implemented against an isolated in-memory DB per test, rather than
// importing the shared `db` singleton from "./client" (which points at
// local.db). The functions under test are re-created here bound to the
// test DB via a factory, mirroring the real module's shape.
import { sql } from "drizzle-orm";

let testDb: ReturnType<typeof drizzle>;

beforeEach(async () => {
  const client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await testDb.run(sql`
    CREATE TABLE users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL,
      district TEXT, state TEXT
    );
  `);
  await testDb.run(sql`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, purpose TEXT NOT NULL,
      state TEXT NOT NULL, district TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'DRAFT',
      created_by TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
  `);
  await testDb.run(sql`
    CREATE TABLE stage_history (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, from_stage TEXT, to_stage TEXT NOT NULL,
      action TEXT NOT NULL, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);
});

describe("projects data layer", () => {
  it("creates a project in DRAFT and writes an initial history row", async () => {
    const { createProjectWith } = await import("./projects");
    const id = await createProjectWith(testDb, {
      name: "Test Bridge",
      purpose: "Testing",
      state: "Odisha",
      district: "Koraput",
      createdBy: "u-agency-1",
    });
    const { listProjectsWith } = await import("./projects");
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
    });
    await expect(
      applyProjectTransitionWith(testDb, id, "PASS_AWARD", "u-1", "district")
    ).rejects.toThrow(/no transition/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/db/projects.test.ts`
Expected: FAIL — `Cannot find module './projects'`.

- [ ] **Step 3: Write `src/db/projects.ts`**

Structured as `...With(db, ...)` functions that take the DB instance explicitly, plus zero-arg convenience wrappers bound to the real `db` singleton — this is what makes Step 1's tests possible without touching `local.db`, and it's the shape the API routes in Task 8 will import.

```ts
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import { projects, stageHistory } from "./schema";
import * as schema from "./schema";
import { transitionProject, type Action, type Role, type Stage } from "@/lib/workflow";

type Db = LibSQLDatabase<typeof schema>;

export interface CreateProjectInput {
  name: string;
  purpose: string;
  state: string;
  district: string;
  createdBy: string;
}

export async function createProjectWith(
  database: Db,
  input: CreateProjectInput
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  await database.insert(projects).values({
    id,
    name: input.name,
    purpose: input.purpose,
    state: input.state,
    district: input.district,
    stage: "DRAFT",
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
  await database.insert(stageHistory).values({
    id: crypto.randomUUID(),
    projectId: id,
    fromStage: null,
    toStage: "DRAFT",
    action: "CREATE",
    actorId: input.createdBy,
    actorRole: "agency",
    createdAt: now,
  });
  return id;
}

export async function listProjectsWith(database: Db) {
  return database.select().from(projects);
}

export async function getProjectWith(database: Db, id: string) {
  const rows = await database.select().from(projects).where(eq(projects.id, id));
  return rows[0] ?? null;
}

export async function applyProjectTransitionWith(
  database: Db,
  projectId: string,
  action: Action,
  actorId: string,
  actorRole: Role
): Promise<Stage> {
  const project = await getProjectWith(database, projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  const nextStage = transitionProject(project.stage as Stage, action, actorRole);
  const now = new Date();
  await database
    .update(projects)
    .set({ stage: nextStage, updatedAt: now })
    .where(eq(projects.id, projectId));
  await database.insert(stageHistory).values({
    id: crypto.randomUUID(),
    projectId,
    fromStage: project.stage,
    toStage: nextStage,
    action,
    actorId,
    actorRole,
    createdAt: now,
  });
  return nextStage;
}

export const createProject = (input: CreateProjectInput) =>
  createProjectWith(defaultDb, input);
export const listProjects = () => listProjectsWith(defaultDb);
export const getProject = (id: string) => getProjectWith(defaultDb, id);
export const applyProjectTransition = (
  projectId: string,
  action: Action,
  actorId: string,
  actorRole: Role
) => applyProjectTransitionWith(defaultDb, projectId, action, actorId, actorRole);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/db/projects.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/db/projects.ts src/db/projects.test.ts
git commit -m "feat: add projects data access layer with workflow-gated transitions"
```

---

### Task 8: Projects API routes

**Files:**
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/projects/[id]/transition/route.ts`

**Interfaces:**
- Consumes: `getSession` (Task 5), `can` (Task 4), `createProject`/`listProjects`/`applyProjectTransition` (Task 7)
- Produces:
  - `GET /api/projects` → `{ projects: Project[] }` (401 if no session)
  - `POST /api/projects` body `{ name, purpose, state, district }` → `{ id: string }`, 201 (401 if no session, 403 if role lacks `project:create`)
  - `POST /api/projects/[id]/transition` body `{ action: Action }` → `{ stage: Stage }` (401/403 as above, 400 with `{ error }` on an invalid transition)

- [ ] **Step 1: Write `src/app/api/projects/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createProject, listProjects } from "@/db/projects";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const all = await listProjects();
  return NextResponse.json({ projects: all });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "project:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as {
    name?: string;
    purpose?: string;
    state?: string;
    district?: string;
  };
  if (!body.name || !body.purpose || !body.state || !body.district) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const id = await createProject({
    name: body.name,
    purpose: body.purpose,
    state: body.state,
    district: body.district,
    createdBy: session.userId,
  });
  return NextResponse.json({ id }, { status: 201 });
}
```

- [ ] **Step 2: Write `src/app/api/projects/[id]/transition/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { applyProjectTransition } from "@/db/projects";
import type { Action } from "@/lib/workflow";

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
  const body = (await request.json()) as { action?: Action };
  if (!body.action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }
  try {
    const stage = await applyProjectTransition(
      id,
      body.action,
      session.userId,
      session.role
    );
    return NextResponse.json({ stage });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
```

- [ ] **Step 3: Manually verify the full flow**

With `npm run dev` running and `local.db` seeded (Task 6):

```bash
# log in as the agency demo user, save cookies
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d '{"userId":"u-agency-1"}'

# create a project
curl -i -b cookies.txt -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Highway","purpose":"Widening","state":"Odisha","district":"Koraput"}'
# note the returned "id"

# list projects — should include both the seeded project and the new one
curl -i -b cookies.txt http://localhost:3000/api/projects

# submit the new project for scrutiny, as the agency that created it
curl -i -b cookies.txt -X POST http://localhost:3000/api/projects/<id>/transition \
  -H "Content-Type: application/json" -d '{"action":"SUBMIT"}'
```

Expected: create → 201 with an `id`; list → 200 with both projects; `SUBMIT` as agency → 200 `{"stage":"SCRUTINY"}` (agency is allowed this one specific transition per `workflow.ts`'s `DRAFT:SUBMIT` rule).

Then confirm agency is correctly blocked from a transition it's *not* allowed to perform — `APPROVE` is only valid for `district`:

```bash
curl -i -b cookies.txt -X POST http://localhost:3000/api/projects/<id>/transition \
  -H "Content-Type: application/json" -d '{"action":"APPROVE"}'
```

Expected: `400 {"error":"Role \"agency\" cannot perform \"APPROVE\" from stage \"SCRUTINY\""}` — this is `workflow.ts`'s fine-grained check firing, not the RBAC 403 (agency passed the coarse `project:transition` gate but failed the per-action rule).

Now log in as district and perform the same `APPROVE` action:

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d '{"userId":"u-district-1"}'
curl -i -b cookies.txt -X POST http://localhost:3000/api/projects/<id>/transition \
  -H "Content-Type: application/json" -d '{"action":"APPROVE"}'
```

Expected: `200 {"stage":"SIA"}`. Confirm the new stage is reflected in a follow-up `GET /api/projects`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/projects
git commit -m "feat: add projects API routes with RBAC-gated create and transition"
```

---

### Task 9: Role switcher UI + dashboard shell

**Files:**
- Create: `src/components/role-switcher.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `getSession` (Task 5), `listProjects` (Task 7), `DEMO_USERS` shape (Task 5, hardcoded label list here to keep this a client component)
- Produces: the first real, clickable screen — this is the deliverable the rest of the plan builds toward, and doubles as the demo role-switcher UX feature (spec Section 7).

No automated test for this task — it's the UI layer with no non-trivial logic of its own; verification is manual click-through per Step 4. (Component/interaction tests can be added in a later plan once React Testing Library is set up — not included here to keep this plan's scope honest.)

- [ ] **Step 1: Write `src/components/role-switcher.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_USERS = [
  { id: "u-central-1", label: "Central (DoLR)" },
  { id: "u-state-1", label: "State Govt (Odisha)" },
  { id: "u-district-1", label: "District (Koraput)" },
  { id: "u-agency-1", label: "Project Agency (NHAI)" },
  { id: "u-field-1", label: "Field Officer" },
] as const;

export function RoleSwitcher() {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function switchTo(userId: string) {
    setPendingId(userId);
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setPendingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {DEMO_USERS.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => switchTo(u.id)}
          disabled={pendingId !== null}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
        >
          {pendingId === u.id ? "Switching..." : u.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/app/(dashboard)/layout.tsx`**

```tsx
import { getSession } from "@/lib/auth";
import { RoleSwitcher } from "@/components/role-switcher";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen">
      <header className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-semibold">National Land Acquisition &amp; Management System</h1>
          <p className="text-sm text-gray-500">
            {session ? `${session.name} — ${session.role}` : "Not signed in"}
          </p>
        </div>
        <RoleSwitcher />
      </header>
      <main className="p-4">
        {session ? children : <p>Select a demo role above to continue.</p>}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/app/(dashboard)/page.tsx`**

```tsx
import { getSession } from "@/lib/auth";
import { listProjects } from "@/db/projects";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const projects = await listProjects();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Projects</h2>
      {projects.length === 0 ? (
        <p className="text-sm text-gray-500">No projects yet.</p>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p.id} className="rounded-md border border-gray-200 p-3">
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-gray-500">
                {p.district}, {p.state} — Stage: {p.stage}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

Note: this intentionally does not link to a project detail page yet — `/projects/[id]` is out of scope for this plan and will be added alongside the GIS/documents plan.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`, open `http://localhost:3000`.

1. Confirm the page shows "Select a demo role above to continue." and the role-switcher buttons.
2. Click "District (Koraput)". Expected: page refreshes, header shows "Sub-Collector, Koraput — district", and the project list shows "Koraput River Bridge Project — Stage: DRAFT" (or its current stage if Task 8's manual verification already advanced it).
3. Click a different role button. Expected: header updates to the new user/role without a full page reload failing.

- [ ] **Step 5: Commit**

```bash
git add src/components/role-switcher.tsx "src/app/(dashboard)" src/app/layout.tsx
git commit -m "feat: add role switcher and project dashboard shell"
```

---

## What this plan does not cover (by design)

Deferred to follow-up plans, each scoped from the same spec:
- GIS map, project alignment overlay, parcel geo-tagging (spec 6.3)
- Compensation calculator, R&R entitlement/Third-Schedule tracking (spec 6.2)
- Document upload/DPR/blueprint repository (spec 6.4)
- Dashboards/reporting, SLA health computation (spec 6.5)
- Project detail page (`/projects/[id]`)
- Swapping the stubbed SQLite DB for Neon Postgres and the mock session for Clerk, once accounts are provisioned (spec 3.2, Section 9 of the design doc)
