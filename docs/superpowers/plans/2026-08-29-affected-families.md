# Affected Families & Entitlement Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give officials a first-class "affected family" record per project, with a fixed 6-item Second Schedule entitlement checklist per family, surfaced on the project detail page wherever the R&R panel already shows.

**Architecture:** Two new flat tables (`families`, `entitlements`), a pure `src/lib/entitlements.ts` (fixed type list, mirrors `RR_STAGES`), a `src/db/families.ts` data module (mirrors `src/db/rr.ts`'s conventions), two new API routes, and a new `FamiliesPanel` client component wired into the existing project detail page next to `RRPanel`.

**Tech Stack:** Existing Next.js/Drizzle/libsql/Vitest/shadcn stack. No new dependencies (uses only `Card`, `Badge`, `Select`, `Input`, `Label`, `Button`, `Textarea` — all already installed).

**Spec:** `docs/superpowers/specs/2026-08-29-affected-families-design.md`; parent spec `docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md` (Section 6.2)

## Global Constraints

- Families and their 6-row entitlement checklist are visible on the project detail page exactly where the existing R&R panel already is (`showRRPanel`, i.e. `STAGES.indexOf(currentStage) >= STAGES.indexOf("RR_IN_PROGRESS")`) — no separate gating rule.
- Entitlement types are a fixed 6-item list, not admin-configurable (matches `RR_STAGES`/`STAGES`).
- No editing/deleting a family or entitlement once created — only forward progress (`PENDING` → `GRANTED`), matching every other record-progression pattern in this app.
- No family data anywhere on the public portal.
- RBAC: `district` and `field` get `family:manage`; only `district` gets `entitlement:grant`.

---

### Task 1: Schema and entitlement type constants

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/lib/entitlements.ts`

**Interfaces:**
- Consumes: `sqliteTable`, `text`, `integer`, `real` (`drizzle-orm/sqlite-core`, already imported in `schema.ts`).
- Produces: `schema.families`, `schema.entitlements` (Drizzle table objects); `type EntitlementType`, `ENTITLEMENT_TYPES: EntitlementType[]`, `ENTITLEMENT_LABELS: Record<EntitlementType, string>` — used by Task 2's data layer and Task 5's UI.

- [ ] **Step 1: Add the two tables to `src/db/schema.ts`**

Append to the end of the file:

```ts
export const families = sqliteTable("families", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  parcelId: text("parcel_id"),
  headOfHouseholdName: text("head_of_household_name").notNull(),
  village: text("village").notNull(),
  category: text("category").notNull(),
  memberCount: integer("member_count").notNull(),
  vulnerableGroup: integer("vulnerable_group", { mode: "boolean" }).notNull().default(false),
  contactPhone: text("contact_phone"),
  surveyedBy: text("surveyed_by").notNull(),
  surveyedAt: integer("surveyed_at", { mode: "timestamp" }).notNull(),
});

export const entitlements = sqliteTable("entitlements", {
  id: text("id").primaryKey(),
  familyId: text("family_id").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("PENDING"),
  amount: real("amount"),
  grantedBy: text("granted_by"),
  grantedAt: integer("granted_at", { mode: "timestamp" }),
  note: text("note"),
});
```

- [ ] **Step 2: Write `src/lib/entitlements.ts`**

```ts
export type EntitlementType =
  | "HOUSING_OR_LAND"
  | "SUBSISTENCE_GRANT"
  | "TRANSPORT_ALLOWANCE"
  | "ARTISAN_TRADER_GRANT"
  | "RESETTLEMENT_ALLOWANCE"
  | "STAMP_DUTY_WAIVER";

export const ENTITLEMENT_TYPES: EntitlementType[] = [
  "HOUSING_OR_LAND",
  "SUBSISTENCE_GRANT",
  "TRANSPORT_ALLOWANCE",
  "ARTISAN_TRADER_GRANT",
  "RESETTLEMENT_ALLOWANCE",
  "STAMP_DUTY_WAIVER",
];

export const ENTITLEMENT_LABELS: Record<EntitlementType, string> = {
  HOUSING_OR_LAND: "Housing unit or land-for-land (lump sum or annuity/employment)",
  SUBSISTENCE_GRANT: "Subsistence grant (1 year)",
  TRANSPORT_ALLOWANCE: "Transport allowance",
  ARTISAN_TRADER_GRANT: "One-time grant (artisan/trader/cattle-shed/petty-shop loss)",
  RESETTLEMENT_ALLOWANCE: "Resettlement allowance",
  STAMP_DUTY_WAIVER: "Stamp duty/registration fee waiver on replacement land",
};

export type FamilyCategory = "landowner" | "livelihood-loser" | "tenant";

export const FAMILY_CATEGORIES: FamilyCategory[] = ["landowner", "livelihood-loser", "tenant"];

export const FAMILY_CATEGORY_LABELS: Record<FamilyCategory, string> = {
  landowner: "Landowner",
  "livelihood-loser": "Livelihood loser",
  tenant: "Tenant",
};
```

- [ ] **Step 3: Push the schema to the local database**

Run: `npm run db:push`
Expected: completes without error, adds `families` and `entitlements` tables.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/lib/entitlements.ts
git commit -m "feat: add families/entitlements schema and Second Schedule type constants"
```

---

### Task 2: Families data layer (tested)

**Files:**
- Create: `src/db/families.ts`
- Test: `src/db/families.test.ts`

**Interfaces:**
- Consumes: `ENTITLEMENT_TYPES`, `type EntitlementType` (Task 1); `schema.families`, `schema.entitlements` (Task 1).
- Produces:
  - `interface CreateFamilyInput { projectId: string; parcelId?: string; headOfHouseholdName: string; village: string; category: string; memberCount: number; vulnerableGroup: boolean; contactPhone?: string; surveyedBy: string }`
  - `interface FamilyEntitlement { id: string; type: EntitlementType; status: "PENDING" | "GRANTED"; amount: number | null; grantedBy: string | null; grantedAt: Date | null; note: string | null }`
  - `interface FamilyWithEntitlements { id: string; projectId: string; parcelId: string | null; headOfHouseholdName: string; village: string; category: string; memberCount: number; vulnerableGroup: boolean; contactPhone: string | null; surveyedBy: string; surveyedAt: Date; entitlements: FamilyEntitlement[] }`
  - `createFamilyWith(db, input: CreateFamilyInput): Promise<string>`
  - `listFamiliesForProjectWith(db, projectId: string): Promise<FamilyWithEntitlements[]>`
  - `grantEntitlementWith(db, entitlementId: string, input: { amount: number; grantedBy: string; note?: string }): Promise<void>`
  - Zero-arg wrappers `createFamily`, `listFamiliesForProject`, `grantEntitlement` — used by Task 4's API routes.

- [ ] **Step 1: Write the failing tests**

```ts
// src/db/families.test.ts
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
    CREATE TABLE families (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, parcel_id TEXT,
      head_of_household_name TEXT NOT NULL, village TEXT NOT NULL, category TEXT NOT NULL,
      member_count INTEGER NOT NULL, vulnerable_group INTEGER NOT NULL DEFAULT 0,
      contact_phone TEXT, surveyed_by TEXT NOT NULL, surveyed_at INTEGER NOT NULL
    );
  `);
  await testDb.run(sql`
    CREATE TABLE entitlements (
      id TEXT PRIMARY KEY, family_id TEXT NOT NULL, type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', amount REAL, granted_by TEXT,
      granted_at INTEGER, note TEXT
    );
  `);
});

describe("createFamilyWith", () => {
  it("creates the family and all 6 entitlement rows as PENDING", async () => {
    const { createFamilyWith, listFamiliesForProjectWith } = await import("./families");
    const id = await createFamilyWith(testDb, {
      projectId: "p-1",
      headOfHouseholdName: "Ramesh Kumar",
      village: "Perambalur Town",
      category: "landowner",
      memberCount: 4,
      vulnerableGroup: true,
      surveyedBy: "u-district-1",
    });
    const families = await listFamiliesForProjectWith(testDb, "p-1");
    expect(families).toHaveLength(1);
    expect(families[0].id).toBe(id);
    expect(families[0].vulnerableGroup).toBe(true);
    expect(families[0].entitlements).toHaveLength(6);
    expect(families[0].entitlements.every((e) => e.status === "PENDING")).toBe(true);
  });
});

describe("listFamiliesForProjectWith", () => {
  it("scopes to the given project only", async () => {
    const { createFamilyWith, listFamiliesForProjectWith } = await import("./families");
    await createFamilyWith(testDb, {
      projectId: "p-1",
      headOfHouseholdName: "Family A",
      village: "V1",
      category: "landowner",
      memberCount: 3,
      vulnerableGroup: false,
      surveyedBy: "u-district-1",
    });
    await createFamilyWith(testDb, {
      projectId: "p-2",
      headOfHouseholdName: "Family B",
      village: "V2",
      category: "tenant",
      memberCount: 2,
      vulnerableGroup: false,
      surveyedBy: "u-district-1",
    });
    const families = await listFamiliesForProjectWith(testDb, "p-1");
    expect(families).toHaveLength(1);
    expect(families[0].headOfHouseholdName).toBe("Family A");
  });
});

describe("grantEntitlementWith", () => {
  it("marks an entitlement GRANTED with amount/grantedBy/grantedAt", async () => {
    const { createFamilyWith, listFamiliesForProjectWith, grantEntitlementWith } = await import(
      "./families"
    );
    await createFamilyWith(testDb, {
      projectId: "p-1",
      headOfHouseholdName: "Family A",
      village: "V1",
      category: "landowner",
      memberCount: 3,
      vulnerableGroup: false,
      surveyedBy: "u-district-1",
    });
    const [family] = await listFamiliesForProjectWith(testDb, "p-1");
    const entitlement = family.entitlements[0];
    await grantEntitlementWith(testDb, entitlement.id, {
      amount: 50000,
      grantedBy: "u-district-1",
      note: "Paid via bank transfer",
    });
    const [updated] = await listFamiliesForProjectWith(testDb, "p-1");
    const grantedEntitlement = updated.entitlements.find((e) => e.id === entitlement.id)!;
    expect(grantedEntitlement.status).toBe("GRANTED");
    expect(grantedEntitlement.amount).toBe(50000);
    expect(grantedEntitlement.grantedBy).toBe("u-district-1");
    expect(grantedEntitlement.grantedAt).not.toBeNull();
    expect(grantedEntitlement.note).toBe("Paid via bank transfer");
  });

  it("rejects granting an already-GRANTED entitlement", async () => {
    const { createFamilyWith, listFamiliesForProjectWith, grantEntitlementWith } = await import(
      "./families"
    );
    await createFamilyWith(testDb, {
      projectId: "p-1",
      headOfHouseholdName: "Family A",
      village: "V1",
      category: "landowner",
      memberCount: 3,
      vulnerableGroup: false,
      surveyedBy: "u-district-1",
    });
    const [family] = await listFamiliesForProjectWith(testDb, "p-1");
    const entitlementId = family.entitlements[0].id;
    await grantEntitlementWith(testDb, entitlementId, { amount: 1000, grantedBy: "u-district-1" });
    await expect(
      grantEntitlementWith(testDb, entitlementId, { amount: 2000, grantedBy: "u-district-1" })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/db/families.test.ts`
Expected: FAIL — `Cannot find module './families'`.

- [ ] **Step 3: Write `src/db/families.ts`**

```ts
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";
import { ENTITLEMENT_TYPES, type EntitlementType } from "@/lib/entitlements";

type Db = LibSQLDatabase<typeof schema>;

export interface CreateFamilyInput {
  projectId: string;
  parcelId?: string;
  headOfHouseholdName: string;
  village: string;
  category: string;
  memberCount: number;
  vulnerableGroup: boolean;
  contactPhone?: string;
  surveyedBy: string;
}

export interface FamilyEntitlement {
  id: string;
  type: EntitlementType;
  status: "PENDING" | "GRANTED";
  amount: number | null;
  grantedBy: string | null;
  grantedAt: Date | null;
  note: string | null;
}

export interface FamilyWithEntitlements {
  id: string;
  projectId: string;
  parcelId: string | null;
  headOfHouseholdName: string;
  village: string;
  category: string;
  memberCount: number;
  vulnerableGroup: boolean;
  contactPhone: string | null;
  surveyedBy: string;
  surveyedAt: Date;
  entitlements: FamilyEntitlement[];
}

export async function createFamilyWith(database: Db, input: CreateFamilyInput): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  await database.insert(schema.families).values({
    id,
    projectId: input.projectId,
    parcelId: input.parcelId ?? null,
    headOfHouseholdName: input.headOfHouseholdName,
    village: input.village,
    category: input.category,
    memberCount: input.memberCount,
    vulnerableGroup: input.vulnerableGroup,
    contactPhone: input.contactPhone ?? null,
    surveyedBy: input.surveyedBy,
    surveyedAt: now,
  });
  await database.insert(schema.entitlements).values(
    ENTITLEMENT_TYPES.map((type) => ({
      id: crypto.randomUUID(),
      familyId: id,
      type,
      status: "PENDING" as const,
    }))
  );
  return id;
}

export async function listFamiliesForProjectWith(
  database: Db,
  projectId: string
): Promise<FamilyWithEntitlements[]> {
  const familyRows = await database
    .select()
    .from(schema.families)
    .where(eq(schema.families.projectId, projectId));

  return Promise.all(
    familyRows.map(async (f) => {
      const entitlementRows = await database
        .select()
        .from(schema.entitlements)
        .where(eq(schema.entitlements.familyId, f.id));
      return {
        id: f.id,
        projectId: f.projectId,
        parcelId: f.parcelId,
        headOfHouseholdName: f.headOfHouseholdName,
        village: f.village,
        category: f.category,
        memberCount: f.memberCount,
        vulnerableGroup: f.vulnerableGroup,
        contactPhone: f.contactPhone,
        surveyedBy: f.surveyedBy,
        surveyedAt: f.surveyedAt,
        entitlements: entitlementRows.map((e) => ({
          id: e.id,
          type: e.type as EntitlementType,
          status: e.status as "PENDING" | "GRANTED",
          amount: e.amount,
          grantedBy: e.grantedBy,
          grantedAt: e.grantedAt,
          note: e.note,
        })),
      };
    })
  );
}

export async function grantEntitlementWith(
  database: Db,
  entitlementId: string,
  input: { amount: number; grantedBy: string; note?: string }
): Promise<void> {
  const rows = await database
    .select()
    .from(schema.entitlements)
    .where(eq(schema.entitlements.id, entitlementId));
  const entitlement = rows[0];
  if (!entitlement) {
    throw new Error(`Entitlement not found: ${entitlementId}`);
  }
  if (entitlement.status === "GRANTED") {
    throw new Error(`Entitlement already granted: ${entitlementId}`);
  }
  await database
    .update(schema.entitlements)
    .set({
      status: "GRANTED",
      amount: input.amount,
      grantedBy: input.grantedBy,
      grantedAt: new Date(),
      note: input.note ?? null,
    })
    .where(eq(schema.entitlements.id, entitlementId));
}

export const createFamily = (input: CreateFamilyInput) => createFamilyWith(defaultDb, input);
export const listFamiliesForProject = (projectId: string) =>
  listFamiliesForProjectWith(defaultDb, projectId);
export const grantEntitlement = (
  entitlementId: string,
  input: { amount: number; grantedBy: string; note?: string }
) => grantEntitlementWith(defaultDb, entitlementId, input);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/db/families.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/db/families.ts src/db/families.test.ts
git commit -m "feat: add families data layer with entitlement checklist"
```

---

### Task 3: RBAC permissions (tested)

**Files:**
- Modify: `src/lib/rbac.ts`
- Modify: `src/lib/rbac.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `"family:manage"`, `"entitlement:grant"` added to `Permission` — used by Task 4's API routes and Task 5's page.

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/rbac.test.ts`, inside the existing `describe("can", ...)` block:

```ts
  it("allows district and field to manage families", () => {
    expect(can("district", "family:manage")).toBe(true);
    expect(can("field", "family:manage")).toBe(true);
  });

  it("does not allow agency, state, or central to manage families", () => {
    expect(can("agency", "family:manage")).toBe(false);
    expect(can("state", "family:manage")).toBe(false);
    expect(can("central", "family:manage")).toBe(false);
  });

  it("only allows district to grant entitlements", () => {
    expect(can("district", "entitlement:grant")).toBe(true);
    expect(can("field", "entitlement:grant")).toBe(false);
    expect(can("state", "entitlement:grant")).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/rbac.test.ts`
Expected: FAIL — `family:manage`/`entitlement:grant` not assignable to `Permission`.

- [ ] **Step 3: Update `src/lib/rbac.ts`**

Change the `Permission` type:

```ts
export type Permission =
  | "project:create"
  | "project:view:own"
  | "project:view:all"
  | "project:transition"
  | "document:upload"
  | "project:geometry:edit"
  | "compensation:manage-rate"
  | "compensation:assess"
  | "family:manage"
  | "entitlement:grant";
```

Change the `district` and `field` entries in `ROLE_PERMISSIONS`:

```ts
  district: [
    "project:create",
    "project:view:own",
    "project:transition",
    "document:upload",
    "project:geometry:edit",
    "compensation:manage-rate",
    "compensation:assess",
    "family:manage",
    "entitlement:grant",
  ],
  state: ["project:view:all", "project:transition", "compensation:manage-rate"],
  central: ["project:view:all", "project:transition"],
  field: ["project:view:own", "document:upload", "family:manage"],
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/rbac.test.ts`
Expected: PASS, all tests including the 3 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rbac.ts src/lib/rbac.test.ts
git commit -m "feat: add family:manage and entitlement:grant permissions"
```

---

### Task 4: API routes

**Files:**
- Create: `src/app/api/projects/[id]/families/route.ts`
- Create: `src/app/api/families/[familyId]/entitlements/[entitlementId]/grant/route.ts`

**Interfaces:**
- Consumes: `getSession` (`@/lib/auth`); `can` (`@/lib/rbac`); `createFamily`, `listFamiliesForProject`, `grantEntitlement` (Task 2); `FAMILY_CATEGORIES` (Task 1).
- Produces: the two POST/GET endpoints — consumed by Task 5's `FamiliesPanel`.

No dedicated test file — this codebase has no route-level tests anywhere (`src/app/api/**` has zero `.test.ts` files); every existing route is verified manually via the dev server, same as Task 6 does here.

- [ ] **Step 1: Write `src/app/api/projects/[id]/families/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createFamily, listFamiliesForProject } from "@/db/families";
import { FAMILY_CATEGORIES } from "@/lib/entitlements";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const families = await listFamiliesForProject(id);
  return NextResponse.json({ families });
}

interface CreateFamilyBody {
  headOfHouseholdName?: string;
  village?: string;
  category?: string;
  memberCount?: number;
  vulnerableGroup?: boolean;
  contactPhone?: string;
  parcelId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "family:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json()) as CreateFamilyBody;

  if (!body.headOfHouseholdName || !body.village || !body.category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!FAMILY_CATEGORIES.includes(body.category as (typeof FAMILY_CATEGORIES)[number])) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!body.memberCount || body.memberCount < 1) {
    return NextResponse.json({ error: "Member count must be at least 1" }, { status: 400 });
  }

  const familyId = await createFamily({
    projectId: id,
    parcelId: body.parcelId,
    headOfHouseholdName: body.headOfHouseholdName,
    village: body.village,
    category: body.category,
    memberCount: body.memberCount,
    vulnerableGroup: body.vulnerableGroup ?? false,
    contactPhone: body.contactPhone,
    surveyedBy: session.userId,
  });
  return NextResponse.json({ familyId });
}
```

- [ ] **Step 2: Write `src/app/api/families/[familyId]/entitlements/[entitlementId]/grant/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { grantEntitlement } from "@/db/families";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; entitlementId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "entitlement:grant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { entitlementId } = await params;
  const body = (await request.json()) as { amount?: number; note?: string };
  if (typeof body.amount !== "number" || body.amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
  }
  try {
    await grantEntitlement(entitlementId, {
      amount: body.amount,
      grantedBy: session.userId,
      note: body.note,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/projects/[id]/families/route.ts" "src/app/api/families/[familyId]/entitlements/[entitlementId]/grant/route.ts"
git commit -m "feat: add family registration and entitlement grant API routes"
```

---

### Task 5: Families panel UI

**Files:**
- Create: `src/components/families-panel.tsx`
- Modify: `src/app/app/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `listFamiliesForProject` (Task 2); `can` (`@/lib/rbac`); `FAMILY_CATEGORIES`, `FAMILY_CATEGORY_LABELS`, `ENTITLEMENT_LABELS` (Task 1); `Card*`, `Badge`, `Button`, `Input`, `Label`, `Select*`, `Textarea` (existing shadcn components); `toneBadgeClass` (`@/lib/status-colors`).
- Produces: the "Affected Families" section on the project detail page. No exports consumed elsewhere.

- [ ] **Step 1: Write `src/components/families-panel.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ENTITLEMENT_LABELS,
  FAMILY_CATEGORIES,
  FAMILY_CATEGORY_LABELS,
  type EntitlementType,
  type FamilyCategory,
} from "@/lib/entitlements";
import { toneBadgeClass } from "@/lib/status-colors";

interface Entitlement {
  id: string;
  type: EntitlementType;
  status: "PENDING" | "GRANTED";
  amount: number | null;
  note: string | null;
}

interface Family {
  id: string;
  headOfHouseholdName: string;
  village: string;
  category: string;
  memberCount: number;
  vulnerableGroup: boolean;
  entitlements: Entitlement[];
}

function entitlementTone(status: string): "pending" | "success" {
  return status === "GRANTED" ? "success" : "pending";
}

function GrantForm({ familyId, entitlementId }: { familyId: string; entitlementId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get("amount"));
    const note = formData.get("note");
    const res = await fetch(
      `/api/families/${familyId}/entitlements/${entitlementId}/grant`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: note ? String(note) : undefined }),
      }
    );
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to grant entitlement");
      return;
    }
    toast.success("Entitlement granted");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor={`amount-${entitlementId}`} className="text-xs">
          Amount (₹)
        </Label>
        <Input
          id={`amount-${entitlementId}`}
          name="amount"
          type="number"
          min="1"
          step="0.01"
          required
          className="h-8 w-32"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`note-${entitlementId}`} className="text-xs">
          Note (optional)
        </Label>
        <Input id={`note-${entitlementId}`} name="note" className="h-8 w-48" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Granting…" : "Grant"}
      </Button>
    </form>
  );
}

function NewFamilyForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [category, setCategory] = useState<FamilyCategory>("landowner");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const vulnerableGroup = formData.get("vulnerableGroup") === "on";
    const contactPhone = formData.get("contactPhone");
    const res = await fetch(`/api/projects/${projectId}/families`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headOfHouseholdName: String(formData.get("headOfHouseholdName") ?? ""),
        village: String(formData.get("village") ?? ""),
        category,
        memberCount: Number(formData.get("memberCount")),
        vulnerableGroup,
        contactPhone: contactPhone ? String(contactPhone) : undefined,
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to register family");
      return;
    }
    toast.success("Family registered");
    (event.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="headOfHouseholdName">Head of household</Label>
        <Input id="headOfHouseholdName" name="headOfHouseholdName" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="village">Village</Label>
        <Input id="village" name="village" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as FamilyCategory)}>
          <SelectTrigger id="category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FAMILY_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {FAMILY_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="memberCount">Household size</Label>
        <Input id="memberCount" name="memberCount" type="number" min="1" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contactPhone">Contact phone (optional)</Label>
        <Input id="contactPhone" name="contactPhone" />
      </div>
      <div className="flex items-center gap-2 self-end pb-2">
        <input id="vulnerableGroup" name="vulnerableGroup" type="checkbox" className="h-4 w-4" />
        <Label htmlFor="vulnerableGroup" className="font-normal">
          Vulnerable group (SC/ST/BPL etc.)
        </Label>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Registering…" : "Register family"}
        </Button>
      </div>
    </form>
  );
}

export function FamiliesPanel({
  projectId,
  families,
  canManage,
  canGrant,
}: {
  projectId: string;
  families: Family[];
  canManage: boolean;
  canGrant: boolean;
}) {
  return (
    <div className="space-y-4">
      {canManage && <NewFamilyForm projectId={projectId} />}

      {families.length === 0 ? (
        <p className="text-sm text-muted-foreground">No affected families registered yet.</p>
      ) : (
        <div className="space-y-3">
          {families.map((family) => (
            <Card key={family.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {family.headOfHouseholdName}
                  <Badge variant="outline">{family.village}</Badge>
                  <Badge variant="outline">{family.category}</Badge>
                  <Badge variant="outline">{family.memberCount} members</Badge>
                  {family.vulnerableGroup && (
                    <Badge variant="outline" className={toneBadgeClass("pending")}>
                      Vulnerable group
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {family.entitlements.map((e) => (
                    <li key={e.id} className="flex flex-col gap-2 border-t pt-2 first:border-t-0 first:pt-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm">{ENTITLEMENT_LABELS[e.type]}</span>
                        <Badge variant="outline" className={toneBadgeClass(entitlementTone(e.status))}>
                          {e.status === "GRANTED" ? `Granted — ₹${e.amount}` : "Pending"}
                        </Badge>
                      </div>
                      {canGrant && e.status === "PENDING" && (
                        <GrantForm familyId={family.id} entitlementId={e.id} />
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Check `toneBadgeClass`'s signature accepts `"pending"`/`"success"` string literals**

Run: `grep -n "export function toneBadgeClass" src/lib/status-colors.ts`
Expected: signature is `toneBadgeClass(tone: StatusTone)` where `StatusTone` includes `"pending"` and `"success"` — confirm before proceeding; if the type is narrower, adjust `entitlementTone`'s return type to match exactly.

- [ ] **Step 3: Wire `FamiliesPanel` into the project detail page**

In `src/app/app/projects/[id]/page.tsx`, add the import:

```tsx
import { listFamiliesForProject } from "@/db/families";
import { FamiliesPanel } from "@/components/families-panel";
```

After the line `const rrAvailableActions = showRRPanel ? getAvailableRRActions(rrStage, session.role) : [];`, add:

```tsx
  const families = showRRPanel ? await listFamiliesForProject(id) : [];
  const canManageFamilies = can(session.role, "family:manage");
  const canGrantEntitlements = can(session.role, "entitlement:grant");
```

After the existing R&R `{showRRPanel && (...)}` block, add a new card:

```tsx
      {showRRPanel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Affected Families</CardTitle>
          </CardHeader>
          <CardContent>
            <FamiliesPanel
              projectId={project.id}
              families={families}
              canManage={canManageFamilies}
              canGrant={canGrantEntitlements}
            />
          </CardContent>
        </Card>
      )}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/families-panel.tsx "src/app/app/projects/[id]/page.tsx"
git commit -m "feat: add affected families panel to project detail page"
```

---

### Task 6: Full regression and demo verification

**Files:** none — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (prior suite + 4 in `families.test.ts` + 3 new in `rbac.test.ts`).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Manually verify end-to-end**

```bash
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
npm run dev > /tmp/nextdev-families.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'

curl -s -c /tmp/c-district.txt -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"userId":"u-district-1"}' > /dev/null

# find a project that's already RR_IN_PROGRESS or later in the seeded data
# (e.g. p-tn-cvg-canal from the dashboards-sla-health seed) and confirm the
# Affected Families card renders with the registration form for a district user
curl -s -b /tmp/c-district.txt http://localhost:3000/app/projects/p-tn-cvg-canal -o /tmp/detail-district.html
grep -o "Affected Families" /tmp/detail-district.html | head -1
grep -o "Register family" /tmp/detail-district.html | head -1

grep -aiE "error" /tmp/nextdev-families.log | grep -v "Warning: Next.js ignored package-lock"
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
```

Expected: "Affected Families" and "Register family" both present for the district role on an RR-stage project; no server errors. (If `p-tn-cvg-canal` isn't at `RR_IN_PROGRESS` or later by the time this runs, pick whichever seeded project is — check `src/db/seed.ts`.)

- [ ] **Step 4: Stop the dev server**

```bash
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
```

---

## What this plan does not cover

- Record of Rights (RoR) issuance tracking (⚪ P2)
- Dispute/appeal workflow (🟡 P1)
- Field photo/geo-tagging, offline PWA capture (🟡 P1)
- Editing or deleting a family/entitlement once created
- Public portal exposure of any family data
