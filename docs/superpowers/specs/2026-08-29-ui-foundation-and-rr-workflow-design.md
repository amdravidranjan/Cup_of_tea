# UI Foundation + R&R Award Workflow — Design

**Parent spec:** `docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md` (Section 2.3 "R&R Award workflow", Section 6.2 "Compensation & R&R", Section 8 "Frontend design guidance")

## 1. Context

Every screen built so far (project list, project detail, compensation panel) uses bare Tailwind utility classes, by explicit standing decision to defer visual polish until the core workflow logic was proven. That deferral ends here: this design covers (a) a real component-based UI foundation applied across the whole app, and (b) the R&R Award workflow — the literal 6-step process from the CAG audit (Chart 5.1), the compensation plan's documented follow-up.

The project's own spec (Section 8) already rules out `design-taste-frontend` and its style variants for this work: they are explicitly scoped to landing pages/portfolios/marketing sites, not dashboards or multi-step product UI. The spec's original tech-stack decision (Section 3.2) already named the correct tool for this surface: shadcn/ui + Tailwind. `web-design-guidelines` (the official Vercel skill) is the correct tool for validating the result, as an accessibility/UX audit pass after the UI is built, not a generator.

## 2. Scope

**In scope:**
- shadcn/ui installed and themed for an institutional/government tool.
- Every existing screen restyled: dashboard shell (`(dashboard)/layout.tsx`), role switcher, project list, project detail page (stage tracker, actions, map wrapper, document list/upload, compensation panel).
- The R&R Award workflow's real 6-step state machine (survey through award), gating the existing `RR_IN_PROGRESS:COMPLETE_RR` transition.
- A UI for driving and viewing R&R progress on the project detail page, built with the new component system.
- An accessibility/UX audit pass (`web-design-guidelines`) after the UI work is complete.

**Out of scope (explicitly deferred, per parent spec Section 6.2):**
- Second Schedule entitlement tracking (per-household housing/land, annuity, subsistence grant, etc.)
- Third Schedule infrastructure checklist per R&R colony
- Versioned entitlement-rate table
- Dispute/appeal workflow
- Mock PFMS/bank disbursement trail
- A public/login landing page (this is where `design-taste-frontend`-style guidance would actually apply, per the parent spec — not built in this pass)

## 3. UI Foundation

### 3.1 Design system

shadcn/ui, New York style, Zinc neutral base. Single accent color: a restrained deep blue (`blue-700`/`blue-600` range, not indigo/violet — avoids the generic "AI app" look while staying legible as an official/institutional color). Consistent 8px (`rounded-lg`) corner radius across buttons, cards, and inputs — one radius scale for the whole app, no mixing sharp and pill shapes.

Semantic status colors, used identically everywhere a status appears (badges, stage trackers, SLA indicators):
- **Amber** — pending / awaiting action / SLA-risk
- **Green** — approved / paid / complete
- **Red** — rejected / overdue
- **Blue** — in-progress (matches the accent, since "in progress" is the most common state a user is actively working with)

### 3.2 Components installed

`button`, `card`, `badge`, `table`, `input`, `label`, `select`, `textarea`, `tabs`, `dialog`, `separator`, `progress`, `avatar`, `dropdown-menu`, `sonner` (toast). Toasts satisfy the parent spec's "toast/inline confirmation on every action, no silent state changes" requirement (Section 7) — every mutating action (transition, upload, assess/pay compensation, RR step) fires a toast on success or failure instead of only `router.refresh()`.

### 3.3 Screens restyled

- **Dashboard shell** (`(dashboard)/layout.tsx`): proper header with app name, current user/role shown via `Avatar` + text, role switcher rebuilt as a `DropdownMenu` instead of a row of buttons.
- **Project list** (`(dashboard)/page.tsx`): `Table` (or `Card` grid on mobile) instead of a bare `<ul>`, with a stage `Badge` per row using the semantic colors above.
- **Project detail page**: the existing stage pill-row becomes a proper horizontal `Progress`/stepper component; `ProjectActions` becomes `Button`s with the toast wiring; document list becomes a `Table`; compensation panel's forms use `Input`/`Label`/`Button` consistently.
- **Map wrapper**: unchanged internals (MapLibre), but the surrounding chrome (legend, buffer-distance caption) restyled to match.

No change to routes, RBAC logic, or data flow — this is a presentation-layer pass over already-working screens.

## 4. R&R Award Workflow

### 4.1 Data model

```
projects.rrStage: text, nullable   -- current R&R sub-stage; null until START_RR fires
```

```ts
export const rrStageHistory = sqliteTable("rr_stage_history", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  fromStage: text("from_stage"),        // nullable — null for the first entry
  toStage: text("to_stage").notNull(),
  action: text("action").notNull(),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  note: text("note"),                   // optional context the actor adds (e.g. "42 families surveyed")
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

This exactly mirrors the existing `stageHistory` table and its audit-trail role for the main project workflow — same shape, same guarantees (immutable, append-only, one row per transition).

### 4.2 State machine

New `src/lib/rr-workflow.ts`, structurally identical to `src/lib/workflow.ts`:

```
RR_STAGES = ["SURVEYED", "SCHEME_DRAFTED", "PUBLISHED", "SUBMITTED_TO_COLLECTOR", "COMMITTEE_APPROVED", "RR_AWARDED"]

RR_TRANSITIONS:
  null:COMPLETE_SURVEY            -> SURVEYED               (district)
  SURVEYED:COMPLETE_SCHEME        -> SCHEME_DRAFTED          (district)
  SCHEME_DRAFTED:COMPLETE_HEARING -> PUBLISHED               (district)
  PUBLISHED:SUBMIT_TO_COLLECTOR   -> SUBMITTED_TO_COLLECTOR  (district)
  SUBMITTED_TO_COLLECTOR:APPROVE_RR_SCHEME -> COMMITTEE_APPROVED (state)
  COMMITTEE_APPROVED:PASS_RR_AWARD -> RR_AWARDED             (district)
```

Each stage maps directly to one of the six literal Chart 5.1 steps (spec Section 2.3). Steps 1-4 and 6 sit with the district role because the Sub-Collector and Collector are the same district-level authority chain in this app's RBAC; step 5 (Committee review -> Commissioner -> Government approval) is gated to `state`, mirroring how the main workflow already gates the equivalent government-level sign-off (`NOTIFIED:STATE_APPROVE`).

`transitionRR(currentStage: RRStage | null, action, role)` is a pure function (same signature shape as `transitionProject`), independently unit-tested.

### 4.3 Gating the outer workflow

The existing `RR_IN_PROGRESS:COMPLETE_RR` transition (district) currently succeeds unconditionally the moment a project enters `RR_IN_PROGRESS` — R&R can be skipped entirely today. This design closes that gap: the transition route checks `project.rrStage === "RR_AWARDED"` before allowing `COMPLETE_RR`, returning 400 otherwise with a message naming the current R&R stage.

### 4.4 API

- `GET /api/projects/[id]/rr` -> `{ stage: RRStage | null, history: RRStageHistoryEntry[] }`
- `POST /api/projects/[id]/rr` -> body `{ action: RRAction, note?: string }`, applies `transitionRR`, appends history, updates `projects.rrStage`, returns the new stage. 403 if the role isn't allowed for that action, 400 if the action isn't valid from the current stage.

### 4.5 UI

A new "Rehabilitation & Resettlement" section on the project detail page, visible once the project reaches `RR_IN_PROGRESS`. Shows the 6 steps as a vertical timeline/stepper (using the `progress`/stepper pattern from the UI foundation): completed steps show who acted, when, and their note; the current step shows an action button (gated by role, same permission-messaging pattern as the rest of the app: "You need State-level approval for this step" instead of a silently-disabled button) with an optional note field. Once `RR_AWARDED`, a `COMPLETE_RR` button appears (district only) to advance the outer project to `POSSESSION`.

## 5. Sequencing

Two plans, in order:

1. **UI foundation plan** — shadcn/ui install + theming + restyle of all existing screens. No new features, no schema changes. Verified by visual/manual check plus the existing test suite passing unchanged (this is a presentation-layer pass; existing business-logic tests must not need changes).
2. **R&R workflow plan** — schema, state machine (TDD, mirroring `workflow.test.ts`), API routes, gating change, and the R&R UI section — built using Plan 1's components from the start.

## 6. Out of scope reminder

Everything in Section 2's "out of scope" list stays deferred. This design does not touch compensation, documents, or GIS logic beyond restyling their existing screens.
