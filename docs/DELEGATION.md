# Team Delegation — TN-GLMS (SIH PS 26016)

**6 people: 1 integrator + 5 lanes.** This is standing ownership of the *entire* project, not a
split of the remaining backlog. Each lane owns a vertical slice of the product for the whole
life of the project and is accountable for four things on it:

| | Means | Evidence it happened |
|---|---|---|
| **Develop** | Write and maintain the code in your file set — existing code as much as new. | Merged PRs |
| **Verify** | Prove it is built right: types clean, unit tests, API contract tests, e2e journey, no console errors. | Green CI + a test file per module |
| **Validate** | Prove it is the *right* thing: matches RFCTLARR/PS 26016, matches `docs/all-features (1).md`, and a real user can actually complete their goal on the page. | Signed row in `docs/ACCEPTANCE.md` |
| **Own** | It is yours on demo day. If it breaks in front of a judge, it is your lane. | You demo that slice |

"Verify" and "validate" are different jobs and both are yours. A green test suite over a page
that no citizen can navigate is a failed lane.

Lanes are drawn along **file ownership**, because in a 6-person repo the thing that actually
kills you is three people editing `schema.ts` on the same afternoon.

---

## Rule 0 — integrator-only files

Nobody but the integrator commits to these. You send a request; the integrator lands it. A PR
from any other lane touching them gets bounced.

| File | Why |
|---|---|
| `src/app/globals.css` | Two stacked design systems (shadcn tokens + UX4G portal sheet). One careless edit re-breaks every page. |
| `src/db/schema.ts` | Every lane reads it. Lane B *proposes* changes; the integrator merges them in one batch per day. |
| `src/app/app/projects/[id]/page.tsx` | 670-line workspace importing every panel. Lanes add props; integrator wires them. |
| `src/app/app/layout.tsx`, `src/components/app-nav.tsx` | Nav placement + role gating — single source of truth. |
| `src/components/ui/**` | The shadcn primitives. Shared by everyone; changes ripple everywhere. |
| `package.json`, `tsconfig`, `drizzle.config`, CI config | Build integrity. |

---

## Complete repo ownership map

Every path has exactly one owner. If something new doesn't fit, the integrator assigns it before
the first commit — no unowned code.

| Path | Owner |
|---|---|
| `src/app/(public)/**`, `src/components/public/**` | **D** |
| `src/app/(auth)/**`, future `/register` | **B** |
| `src/app/app/page.tsx` (dashboard), `src/components/dashboard-stats.tsx` | **C** |
| `src/app/app/{grievances,project-requests,reports,workload,conflicts,contractors,land-bank,interoperability}/**` | **C** |
| `src/app/app/encroachment/**` | **E** |
| `src/app/app/projects/[id]/3d/**` | **A** |
| `src/app/app/field/**` | **A** |
| `src/app/api/**` | **B** |
| `src/db/**` (except `schema.ts`), `src/db/seed.ts`, `drizzle/**` | **B** |
| `src/lib/{auth,rbac,project-scope}.ts` | **B** |
| `src/lib/{geo,elevation,parcel-generation,offline-queue,storage}.ts` | **A** |
| `src/lib/{compensation,workflow,rr-workflow,entitlements,parcel-status,grievance-workflow,sla,infrastructure,document-requirements,generated-documents,notice-template,land-records,compensation-status,document-categories,status-colors}.ts` | **C** |
| `src/lib/{i18n,format,voice-assistant}.ts`, `src/components/bilingual.tsx` | **D** |
| `src/lib/ai/**` | **E** |
| Map components (`project-map`, `project-3d-view`, `field-parcel-map`, `before-after-slider`, `geometry-editor`, `elevation-profile`, `field-parcel-*`, `offline-banner`, `service-worker-registration`) | **A** |
| All `*-panel.tsx`, `*-list.tsx`, `*-queue.tsx`, `stage-*`, `project-actions`, `generate-document`, `document-upload`, `global-search`, `notification-*`, `new-project-form` | **C** |
| `risk-assessment-card`, `risk-gauge`, `land-rate-prediction-card`, `document-insights` | **E** |
| `track-*`, `file-grievance-form`, `request-project-form`, `public-project-search` | **D** |
| `e2e/**`, all `*.test.ts`, `src/**/{error,loading,not-found}.tsx` | **E** |
| `docs/**` | **E** (except this file + `CONTRACTS.md` — integrator) |
| Rule-0 list above | **Integrator** |

---

## Lane A — Geospatial, 3D & Field

**Surface owned:** every map in the product, the 3D view, the drawing tools, elevation profiles,
the whole `/app/field` offline experience, and the tile infrastructure behind them.

**Maintain (already exists):** project map with parcel-status colouring and impact buffer,
before/after slider, geometry editor, elevation profile, field parcel list/card/map, offline
queue + service worker.

**Build**
1. **Offline tile cache** — download Esri imagery, terrain DEM and vector tiles for the demo
   bboxes at z10–z16 into `public/tiles/{z}/{x}/{y}`, serve from a local route, hit the network
   only outside the cached bbox (when a judge zooms out). Doubles as the bad-venue-wifi contingency.
2. **Focus / recenter control on every map** — fly back to project bounds. Today, panning away
   strands you.
3. **3D on every project**, not one — the hard gate is gone; per-project alignment + terrain data isn't.
4. **Real 3D models** — a bridge should look like a bridge standing on the land. MapLibre custom
   layer with three.js (or deck.gl `ScenegraphLayer`): bridge deck + piers along the alignment,
   house volumes with pitched roofs on structure-bearing parcels, towers, canal cross-sections;
   driven by `project.assetKind` / `parcel.structureType` (Lane B day-1 schema batch).
5. Geometry editor: coordinate readout, satellite toggle, survey/patta capture — finish and harden.

**Verify** — unit tests on `geo.ts`/`elevation.ts` (bbox, buffer, area, gradient); an e2e that
loads every map surface and asserts a non-zero canvas; a WebGL-absent fallback path; DevTools
throttled-to-offline run of `/app/field`.

**Validate** — an officer can locate a parcel, draw one, and correct one without leaving the page;
a judge who pans away can get back in one click; 3D reads as the real structure to someone who has
never seen the project.

**Standing hazard:** MapLibre's own `.maplibregl-map{position:relative}` ties on specificity with
Tailwind's `.absolute` and wins on source order, collapsing containers to height 0. Every map
container keeps its inline `position:absolute; inset:0`. Do not "clean this up".

---

## Lane B — Data, Auth & API platform

**Surface owned:** the database, the seed, every API route, sessions, RBAC and project scoping.
Every other lane consumes this lane's output, which is why it moves first.

**Maintain:** 25 tables, ~50 API routes, `lib/rbac.ts`, `lib/project-scope.ts`, demo cookie auth.

**Build**
1. **Deepen the data** — the seed is thin and judges click into empty corners. Target 12–15
   projects across 6+ districts, every RFCTLARR stage represented, 300+ parcels, 150+ families
   with real entitlement rows, grievances at every workflow state, disputes, tenders, land-bank
   entries, gram sabha records, notification logs. Plus `assetKind`/`structureType` for Lane A.
2. **Real registration + login** alongside the demo logins — `POST /api/auth/register`, scrypt
   hashing via `node:crypto` (no new heavy deps), email/mobile identity, a `citizen` role with
   public-side privileges only, a `/register` page. Demo logins stay one-click; the real one
   proves it isn't a mock.
3. **Audit trail table** — actor, action, entity, before/after, timestamp; written by every
   mutating route. Feeds Lane C's history drill-downs and is a novelty pillar in its own right
   (hash-chained = tamper-evident).
4. **Zod validation on every route** — judges will paste garbage. Structured `{error, field}`,
   never a 500.
5. **Referential integrity pass** — no orphan rows, cascade rules, and a `db:check` script that
   fails loudly if the seed is inconsistent.

**Verify** — a contract test per route (auth required, role enforced, scope enforced, bad input
rejected, happy path shaped as documented); `rbac`/`project-scope` unit tests stay green;
`npm run db:seed` from empty must succeed reproducibly.

**Validate** — the **role × route matrix**: for all 6 roles against every route, the outcome
matches Section 6 of the features doc. A district officer must never see another district's
project through *any* route, including search and notifications.

---

## Lane C — Officer console & statutory workflow

**Surface owned:** everything a government officer touches after login — the dashboard, the
seven-tab project workspace panels, and all oversight tools. The largest lane by feature count.

**Maintain:** compensation, R&R/families, infrastructure, legal, tenders, community, documents
panels; grievance and project-request queues; reports, workload, conflicts, contractors, land bank;
and the rules modules in `src/lib` (workflow, entitlements, SLA, document requirements…).

**Build**
1. **Apply the `compensation-panel.tsx` pattern to every table.** That one panel now has search,
   village/status filters, clickable rows, and a detail dialog with the full First Schedule
   breakdown. Families, tenders, documents, land bank, legal disputes, grievances, contractors and
   conflicts have none of it. Pattern: widen the data at the page level → add search + filters →
   add the row drill-down.
2. **Link the pages; stop merely displaying.** R&R is the worst case — a family row should open a
   record linking to its parcel → its award → its grievances → its heirs/succession → its
   entitlement grant history. Every ID on screen is a link.
3. **Detail, with the legal basis.** Each drill-down states which section/schedule authorises the
   number, who acted, when, and what happens next — including *which role* must act next when the
   current user cannot.
4. **Every action reachable and reversible-looking** — no dead buttons, confirmation on
   irreversible steps, optimistic state that reconciles with the server.
5. Empty states, skeletons and error states on every table.

**Verify** — unit tests for every rules module (award maths, stage guards, entitlement eligibility,
SLA); an e2e per workflow: notify → approve → declare → award → pay → R&R → possession; a test
proving a stay order actually blocks pay and possession.

**Validate** — walk each of the 7 tabs as the role that owns it and ask: can this officer finish
their job here without asking anyone for a number that is on another screen? Terminology matches
the Act, not our internal identifiers.

---

## Lane D — Citizen portal, language & assistant

**Surface owned:** everything a member of the public sees, plus the bilingual layer across the
entire product.

**Maintain:** landing page, public project list/detail, compensation and R&R info pages, schemes,
documents, grievance filing + tracking, project request + tracking, developer API docs, VANI.

**Build**
1. **Make "தமிழ் | English" a real switch.** It is static text today, which is worse than absent.
   Language context + cookie, a `t()` over the whole app, Tamil in the console too. The
   infrastructure exists (`lib/i18n.ts`, `<Bilingual>`, global `.ta` class) — this is wiring and
   vocabulary, not translation from zero.
2. **The citizen journey end-to-end**: register → find my land by survey/patta number → see my
   award broken down line by line → see my R&R entitlements and which are granted → file a
   grievance → track it → download my notice. This is the story judges most want to try themselves.
3. **VANI beyond canned lookups** — entitlement Q&A, "what happens next for my parcel", `ta-IN`
   speech in and out, and a visible transcript so it works without audio.
4. **Mobile and accessibility** — judges open it on a phone. Keyboard navigation, contrast,
   labelled controls, and Tamil rendering at every breakpoint.

**Verify** — an e2e citizen journey run twice, once per language, asserting no untranslated string
in the Tamil pass; a public-API test asserting zero PII leaks; a no-Speech-API browser fallback test.

**Validate** — hand the phone to someone who has not seen the project and give them one sentence
("find out what your land is worth and complain about it"). If they need help, it isn't done.

---

## Lane E — Intelligence, QA & release

**Surface owned:** the four analytics modules, the entire test and e2e harness, all error/loading
states, and the demo itself.

**Maintain:** risk score, land-rate prediction, encroachment heuristic, document intelligence, and
33 existing test files.

**Build**
1. **The judge-input contingency work — this lane's core job.** Every feature that is
   frontend-only, or depends on something that can fail (AI modules, tile servers, speech API,
   any fetch), gets a deterministic local fallback that always returns a sensible, explainable
   answer. **Rule: nothing may show an infinite spinner or a raw error, ever.**
2. **The scripted demo run** as a Playwright e2e walking the full flow across all roles. It runs
   before every merge to `main` — regression net and rehearsal in one.
3. **Seeded "try it yourself" card** — survey numbers, tracking numbers, logins, project names a
   judge can type in, every one guaranteed to resolve. Printed, on the table.
4. **Keep the analytics honest** — every score shows its factors and its formula. Our defensible
   position is *explainable and deterministic*, not "we have a model". Nothing may look like a
   trained model that isn't one.
5. **The weekly consistency audit** — role/permission logic, nav placement, terminology, currency
   and area formatting, breadcrumbs, back-links, dead buttons — written up as a numbered list with
   an owner per line.

**Verify** — coverage of every `lib/ai` module including boundaries; CI runs types + unit + e2e on
every PR; a chaos pass with the network throttled/offline and the DB seeded empty.

**Validate** — the demo runs three times end to end on the actual venue laptop, offline, without a
human touching anything but the script.

---

## Integrator (you)

Owns the Rule-0 files, reviews and merges every PR, arbitrates schema changes, and is the only
person who may break a tie between lanes.

**Daily:** `npx tsc --noEmit`, `npm test`, the e2e demo script on `main`. If `main` is red,
everything stops until it is green — `main` must be demo-able at every hour of the project.

**Owns `docs/CONTRACTS.md`** — the TypeScript interfaces *between* lanes (what B's route returns
and C's panel consumes; what B stores and A renders). Lanes build against a stub from this file
instead of blocking on each other. Interface changes are a PR against this doc first, code second.

---

## Definition of Done — every PR, every lane

A PR is not mergeable until all seven hold:

1. `npx tsc --noEmit` clean.
2. Unit tests for new logic; existing suite green.
3. The feature is reachable by clicking from `/` or `/app` — no orphan routes, no dead buttons.
4. Tested as **every** role that can reach it, and as one role that must not.
5. Empty, loading and error states exist and were seen.
6. Garbage input tried by hand (blank, huge, negative, wrong type, injection-looking string).
7. A row added to `docs/ACCEPTANCE.md`: feature, owner, how it was verified, how it was validated, date.

---

## Verification ladder (what "it works" means here)

| Level | Tool | Owner |
|---|---|---|
| Types | `tsc --noEmit` | Everyone, per PR |
| Unit — pure logic | Vitest | The lane owning the module |
| Contract — API shape, auth, scope | Vitest + route handlers | **B** |
| Journey — e2e per role | Playwright | **E**, scenarios contributed by each lane |
| Role × route matrix | Script over the matrix | **B**, audited by **E** |
| Manual acceptance | `docs/ACCEPTANCE.md` | Cross-lane, see below |
| Demo rehearsal | The scripted run, offline | **E** + integrator |

## Validation — cross-lane, round robin

**Nobody validates their own lane.** Each Friday: **A validates B → B validates C → C validates D
→ D validates E → E validates A**, integrator spot-checks any two. The validator works only from
`docs/all-features (1).md`, the RFCTLARR sections, and the user's actual goal on the page — never
from the author's explanation. Findings go into `docs/ACCEPTANCE.md` as open rows with an owner.

Validation sources, in precedence order:
1. RFCTLARR Act 2013 (Sections 11, 19, 26–30; First and Second Schedules) — the maths and the sequence.
2. SIH PS 26016 statement — the problem we claimed to solve.
3. `docs/all-features (1).md` — what we said exists. If code and doc disagree, one of them is a bug; decide which and fix it that day.
4. User flow — can the actual person finish the actual task on this screen.

---

## Git workflow

```
main                        protected, always demo-able, always green
  ├── feat/a-offline-tiles
  ├── feat/b-real-auth
  └── feat/c-rr-drilldown
```

- Branches: `feat/<lane-letter>-<topic>`. One topic per branch, one lane per branch.
- **Small PRs merged daily.** A branch older than a day in a repo this active is a conflict waiting.
- `git pull --rebase origin main` every morning, before anything.
- Squash-merge; the PR description names the lane, the task number, and how it was verified.
- `CODEOWNERS` mirrors the ownership map so GitHub auto-requests the right reviewer.
- **Never commit** `local.db`, `.next/`, `node_modules/`, or downloaded tiles — tiles come from a
  checked-in download script with gitignored output.
- Review rule: the reviewer is the *next* lane in the round robin, so review and validation are
  the same pair. The integrator merges.

## Cadence

- **Daily, 10 min:** each lane says what merged yesterday, what's blocked, what it needs from
  another lane's contract.
- **Daily, integrator:** green-main check on `main`.
- **Friday:** cross-lane validation round + E's consistency audit, both landed as written lists.
- **Every second week:** full demo rehearsal, offline, on the venue laptop, timed.

## Sequencing

1. **Day 1 — Lane B alone:** schema expansion + seed + the `assetKind` field. A/C/D all build
   against this data, so it lands before anyone goes wide. Others start on pure-UI work meanwhile.
2. **Then A / C / D fully parallel** — their file sets do not overlap by construction.
3. **E runs continuously from day 1**, and owns the final stretch of the timeline exclusively for
   hardening, contingencies and rehearsal. No new features land in that window.

## Single points of failure to watch

| Risk | Mitigation | Owner |
|---|---|---|
| Lane B slips → three lanes idle | B's day-1 scope is seed + schema only; everything else in B is later | Integrator |
| Real 3D models are the hardest unknown | Timebox; a styled extruded-geometry version is the fallback and must exist first | A |
| Venue has no internet | Offline tiles + local DB + zero external calls in the demo path; rehearse offline | A + E |
| Judge input crashes a page | Zod everywhere + error boundaries + the fuzz step in Definition of Done | B + E |
| `main` goes red near the deadline | Green-main rule; freeze features for the final stretch | Integrator |
