# Affected Families & Entitlement Tracking — Design

**Parent spec:** `docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md` (Section 6.2 "Compensation & R&R", Section 2.1 "Second Schedule", Section 2.3 "R&R Award workflow")

## 1. Context

Raised directly during this build: officials currently have no way to see the *people* behind a project. The schema models land (`parcels`) and money (`compensations`, tied to a parcel) but never a person or household — there is no `families`/`landowners` entity anywhere in the app. That's a real gap, not an oversight in review: the parent spec's own R&R Award workflow (Section 2.3, Chart 5.1) starts with "**Survey of affected families**," and the Second Schedule (Section 2.1) defines per-family entitlements (housing/land, subsistence grant, transport allowance, artisan/trader grant, resettlement allowance, stamp-duty waiver) — none of which this app can track today because there's nothing to attach them to.

This closes Section 6.2's two related P1 items at once: "Per-family compensation & disbursement tracking" (the family-facing half — the parcel/compensation half already exists) and "Second Schedule entitlement tracker per household."

## 2. Scope

**In scope:**
- A `families` table: one row per affected family/household, tied to a project and optionally to a specific parcel (some affected families are livelihood-losers with no land of their own — e.g. a tenant farmer or a shop employee — so the link is nullable).
- A `entitlements` table: one row per family per Second Schedule benefit type (6 fixed types, verbatim from the parent spec's Section 2.1 research) — created as `PENDING` alongside the family, individually markable `GRANTED` with an amount/date, mirroring the existing "fixed checklist, progressively completed" shape already used by `RR_STAGES`.
- A new "Affected Families" panel on the project detail page, visible wherever the existing R&R panel is (same stage gate), listing families with an expandable entitlement checklist per family.
- RBAC: `district` and `field` roles can register/edit family records (survey work); `district` grants entitlements (the Collector's role in Chart 5.1 step 6).

**Out of scope (explicitly deferred):**
- Record of Rights (RoR) issuance tracking (⚪ P2, parent spec 6.2) — a separate, later concern (allotment of *replacement* land, not the family record itself).
- Dispute/appeal workflow (🟡 P1, parent spec 6.2) — families can be the *subject* of a future dispute record, but that's a different entity this design doesn't build.
- Photo/geo-tagging of families or field-collected evidence (🟡 P1, parent spec 6.6 PWA/offline) — out of scope for this pass.
- Editing/deleting a family or entitlement once created — matches this app's existing pattern (no compensation record is ever edited or deleted either, only progressed forward); corrections are a later concern.
- Public portal exposure of family data — explicitly excluded per the public-transparency-portal design's data-exposure policy (no landowner/family names, ever).

## 3. Data Model

Two new tables in `src/db/schema.ts`, following the existing style (flat, primary-key-only, no foreign-key constraints — matches every other table in this schema):

```ts
export const families = sqliteTable("families", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  parcelId: text("parcel_id"), // nullable: livelihood-losers may have no parcel of their own
  headOfHouseholdName: text("head_of_household_name").notNull(),
  village: text("village").notNull(),
  category: text("category").notNull(), // "landowner" | "livelihood-loser" | "tenant"
  memberCount: integer("member_count").notNull(),
  vulnerableGroup: integer("vulnerable_group", { mode: "boolean" }).notNull().default(false),
  contactPhone: text("contact_phone"),
  surveyedBy: text("surveyed_by").notNull(),
  surveyedAt: integer("surveyed_at", { mode: "timestamp" }).notNull(),
});

export const entitlements = sqliteTable("entitlements", {
  id: text("id").primaryKey(),
  familyId: text("family_id").notNull(),
  type: text("type").notNull(), // one of ENTITLEMENT_TYPES, see src/lib/entitlements.ts
  status: text("status").notNull().default("PENDING"), // "PENDING" | "GRANTED"
  amount: real("amount"),
  grantedBy: text("granted_by"),
  grantedAt: integer("granted_at", { mode: "timestamp" }),
  note: text("note"),
});
```

`category` and `type`/`status` are plain `text` columns validated at the application layer (`src/lib/entitlements.ts`), matching how `parcels.status` and `compensations.status` are already handled — no DB-level enum, consistent with this codebase's existing convention.

### 3.1 Entitlement types (fixed, verbatim from parent spec Section 2.1)

New pure module `src/lib/entitlements.ts`:

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
```

Six fixed labels, not a configurable list — matches how `RR_STAGES`/`STAGES` are fixed arrays elsewhere in this codebase, not admin-editable.

## 4. Data Layer

New `src/db/families.ts`, following the existing `db/*.ts` convention:

```ts
export interface CreateFamilyInput {
  projectId: string;
  parcelId?: string;
  headOfHouseholdName: string;
  village: string;
  category: "landowner" | "livelihood-loser" | "tenant";
  memberCount: number;
  vulnerableGroup: boolean;
  contactPhone?: string;
  surveyedBy: string;
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
  entitlements: {
    id: string;
    type: EntitlementType;
    status: "PENDING" | "GRANTED";
    amount: number | null;
    grantedBy: string | null;
    grantedAt: Date | null;
    note: string | null;
  }[];
}

export async function createFamilyWith(database: Db, input: CreateFamilyInput): Promise<string>
// Inserts the family row, then inserts one PENDING entitlement row per
// ENTITLEMENT_TYPES entry in the same call — a family is never created
// without its full entitlement checklist, same as a project never reaching
// a stage without a stage_history row.

export async function listFamiliesForProjectWith(database: Db, projectId: string): Promise<FamilyWithEntitlements[]>

export async function grantEntitlementWith(
  database: Db,
  entitlementId: string,
  input: { amount: number; grantedBy: string; note?: string }
): Promise<void>
// Sets status to GRANTED, amount, grantedBy, grantedAt = now(). Throws if
// the entitlement is already GRANTED (matches markCompensationPaidWith's
// implicit single-transition shape — nothing in this app un-grants).
```

Zero-arg wrappers (`createFamily`, `listFamiliesForProject`, `grantEntitlement`) added the same way every other `db/*.ts` module does it.

## 5. API & RBAC

Two new routes, following the existing `src/app/api/projects/[id]/...` pattern:

- `POST /api/projects/[id]/families` — body: the `CreateFamilyInput` fields minus `projectId`/`surveyedBy` (taken from the URL param and session). Requires `can(session.role, "family:manage")`.
- `POST /api/families/[familyId]/entitlements/[entitlementId]/grant` — body: `{ amount: number; note?: string }`. Requires `can(session.role, "entitlement:grant")`.

`src/lib/rbac.ts` gains two permissions:

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

`district` gains both `family:manage` and `entitlement:grant` (the Collector role, Chart 5.1's approving authority); `field` gains `family:manage` only (on-ground survey work, no grant authority) — matches the parent spec's role table (Section 4): Field/Verification Officer does "on-ground verification... possession/R&R status updates," District/Collector "manages compensation for their district" and is the R&R Award authority end-to-end.

## 6. Page & Component Changes

### 6.1 Project detail page

`src/app/app/projects/[id]/page.tsx` gains a new "Affected Families" card, placed directly after the existing R&R card, gated by the same `showRRPanel` boolean already computed there (`STAGES.indexOf(currentStage) >= STAGES.indexOf("RR_IN_PROGRESS")`) — families are the subject of the R&R process, so they become relevant exactly when R&R does.

```tsx
const families = showRRPanel ? await listFamiliesForProject(id) : [];
const canManageFamilies = can(session.role, "family:manage");
const canGrantEntitlements = can(session.role, "entitlement:grant");
```

### 6.2 `src/components/families-panel.tsx` (new, `"use client"`)

- A form (visible only when `canManageFamilies`) to register a new family: head-of-household name, village, category (shadcn `Select`, existing primitive), member count, vulnerable-group toggle (plain `<input type="checkbox">`, styled inline — this codebase has no shadcn `Checkbox` primitive yet and one boolean field doesn't justify adding it), contact phone (optional) — posts to `/api/projects/[id]/families`, `router.refresh()` on success, toast feedback (matches `RRPanel`'s `perform()` pattern exactly).
- A list of registered families, each rendered as its own `Card` (existing primitive — no `Collapsible` primitive exists in this codebase and a 6-row checklist is short enough to show inline, matching how `RRPanel` always shows its full 6-step list rather than collapsing it) showing: name, village, category badge, member count, vulnerable-group badge if true, and the entitlement checklist beneath.
- The 6-row entitlement checklist per family (mirrors `RRPanel`'s stage-list rendering): label, status badge (`PENDING`/`GRANTED` via `toneBadgeClass`), and — only when `canGrantEntitlements` and status is `PENDING` — a small inline form (amount + optional note) posting to the grant route.

No automated test for `families-panel.tsx` — same rationale as every other panel component in this codebase.

## 7. Tests

- `src/lib/entitlements.ts` needs no test file — it's a static data module (two arrays, one record), same as `RR_STEP_LABELS` in `rr-panel.tsx` has none.
- `src/db/families.test.ts` (in-memory libSQL, same harness as `rr.test.ts`): creating a family inserts all 6 entitlement rows as `PENDING`; `listFamiliesForProjectWith` returns families with their entitlements nested and scoped to the right project; `grantEntitlementWith` updates status/amount/grantedAt and rejects granting an already-`GRANTED` entitlement.
- `src/lib/rbac.test.ts` (existing file, extended): `district` and `field` have `family:manage`; only `district` has `entitlement:grant`; `agency`/`state`/`central` have neither.

## 8. What this design does not cover

- Record of Rights (RoR) issuance tracking (⚪ P2)
- Dispute/appeal workflow (🟡 P1) — a future consumer of `families`, not built here
- Field photo/geo-tagging, offline PWA capture (🟡 P1, parent spec 6.6)
- Editing or deleting a family/entitlement once created
- Public portal exposure of any family data (explicitly excluded, matches the public-portal design's data policy)
