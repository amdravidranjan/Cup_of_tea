# Work Log — Feature Audit & UI Unification

Running record of this pass. Newest phase at the bottom.
Reference spec: `docs/all-features (1).md`.

---

## Baseline (start of pass)

Measured, not assumed:

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean, 0 errors |
| `npm test` (vitest) | 33 files, 228 tests, all passing |
| `local.db` | present (3.1 MB, seeded) |
| Orphaned components (built, never imported) | `brand-logo`, `role-switcher`, `voice-chatbot` |

**Conclusion: the backend/data layer is healthy.** Every schema table, db
module, and API route in the spec exists and is tested. The damage from the
recent UI pass is confined to the presentation layer and to a few features
that exist in code but are not mounted anywhere a user can reach them.

---

## Root cause of "things are broken"

`src/app/globals.css` contains **two competing design systems stacked in one
file**:

1. Lines 1–150: the original shadcn/Tailwind token system (parchment `#faf7f1`
   + navy `#16294d` + sandstone `#be6a3b`), consumed by every `/app` page via
   `bg-background`, `text-foreground`, `bg-primary`, etc.
2. Lines 150+: a newly pasted **UX4G / TN-GLMS government portal** stylesheet
   (gov blue `#0b5394` + saffron `#e56b00` + gold `#ffc107`), consumed by the
   public/landing pages via raw class names (`.site-header`, `.main-nav`,
   `.hero`, `.svc-tile`, …).

The second block is written as **unlayered CSS**, while Tailwind's own base
styles live inside `@layer base`. In Tailwind v4 unlayered CSS always wins over
layered CSS regardless of specificity. So the UX4G block silently overrides the
token system across the whole app:

| Offending rule | Damage |
|---|---|
| `body { background: var(--ux-white); color: var(--ux-text-body); font-size: 14px }` | Kills `bg-background`/`text-foreground` on **every** page, `/app` included |
| `a { color: var(--ux-link) }` + `a:hover { text-decoration: underline; color: orange }` | Every shadcn `<Button asChild><Link>` in `/app` renders as a blue link with an orange underline on hover |
| `*, *::before, *::after { margin: 0; padding: 0 }` | Re-zeroes after Tailwind preflight |
| `html, body, #root { height: 100% }` | Fights `min-h-screen` scroll containers |
| `@import url(fonts.googleapis…)` placed **mid-file** | Invalid CSS — `@import` must precede all rules, so the browser drops it and **Noto Sans never loads** |

That single file explains the visual mismatch between the landing page and
everything behind the login.

---

## Plan

Ordered simple → complex, per the request to leave hard things for last.

- **Phase 1 — Theme unification.** Fix the CSS layering bugs, and remap the
  shadcn design tokens onto the TN-GLMS palette so every `/app` page inherits
  the landing page's visual language automatically. The landing page's own
  raw `.ux-*` classes are left byte-for-byte untouched.
- **Phase 2 — Feature audit.** Walk the spec table by table and record, per
  feature, whether it is reachable in the UI.
- **Phase 3 — Build the gaps** found in Phase 2, simplest first.
- **Phase 4 — Verify.** Typecheck, tests, and a real browser pass over every
  route.

---

## Phase 1 — done: theme foundation

`src/app/globals.css`:
- `--font-sans` / `--font-heading` pointed at `--font-plex-sans` / `--font-source-serif`,
  neither of which exists any more. Repointed at the Noto Sans that the root
  layout actually loads via `next/font`. (Before this, every `/app` screen was
  falling back to the browser default font.)
- Remapped the shadcn tokens onto the TN-GLMS palette (`#0b5394` gov blue,
  `#e56b00` saffron, `#d0d7e2` borders, `0.25rem` radius) so `/app` inherits
  the landing page's colours without touching the landing page's own CSS.
- Narrowed the unlayered resets that were overriding the token system app-wide
  (`body` background/color, global `a` color → `a:not([class])`, `height:100%`).
- Deleted the mid-file Google Fonts `@import` (illegal position → always
  dropped by the browser; also redundant with `next/font`).

## Phase 2 — done: the three broken maps had one shared root cause

MapLibre's stylesheet declares `.maplibregl-map { position: relative }`. That
selector has the **same specificity** as Tailwind's `.absolute` and is injected
**later**, so it wins the tie. Any map container written as
`<div ref={containerRef} className="absolute inset-0" />` therefore stops being
absolutely positioned, `inset-0` has nothing to resolve against, and the
container collapses to **height: 0** — the map initialises, fetches its tiles
successfully (verified: 28/28 Esri tiles HTTP 200), and paints into a zero-high
box. Blank.

Three components had it; `project-map.tsx` and `geometry-editor.tsx` escaped it
only because they set an explicit `h-[28rem]` instead.

| Component | Symptom reported | Measured height before → after |
|---|---|---|
| `before-after-slider.tsx` | "before after satellite image not working" | 0 → 446 ✅ |
| `field-parcel-map.tsx` | "field verification map thing is not working" | 0 → 382 ✅ |
| `project-3d-view.tsx` | "3d not working" | 0 → 510 ✅ |

Fixed by positioning those containers with **inline styles**, which outrank both
stylesheets, plus a `ResizeObserver` on the before/after panes so a map built
while its tab is inactive still resizes correctly. Verified in a real browser:
Esri imagery now renders in both compare panes, the field map draws, and the 3D
terrain drape + "fly along alignment" works.

Note: `/projects/[id]/3d` is hard-gated to a single flagship project
(`p-demo-bridge-1`); every other project 404s. Flagged for Phase 3 — the gate is
intentional but undiscoverable, which reads as "3D is broken".
---

## Phase 3 — compensation tab rebuilt

The data model was already rich; the UI was discarding it. `listParcels`
returns `surveyNumber` and `pattaNumber` (both fully populated in the seed —
e.g. `100/1` / `SIV-PTA-00001`) and `compensations` stores the entire award
breakdown, but the project page mapped all of it down to
`{ id, village, areaHectares, compensation: { id, total, status } }` before the
component ever saw it. So the table showed four columns, no identifiers, no
search across 535 parcels / 22 pages, and no way to open a record.

Changes:
- `src/lib/format.ts` — added `formatCurrency`, `formatCurrencyCompact`,
  `formatArea`. Rupee values are stored as floats, so unformatted output was
  leaking things like `Rs 60,42,558.387` (three decimals of a paisa) into the
  award table. Headline totals now read `₹292.76 Cr` instead of a 12-digit run.
- `projects/[id]/page.tsx` — passes survey/patta numbers, parcel acquisition
  status, impact-buffer flag and the full award breakdown through.
- `compensation-panel.tsx` — rebuilt:
  - **Survey No. and Patta No. columns** (the identifiers a landowner or
    officer actually quotes).
  - **Search** across survey no. / patta no. / village, a **village filter**,
    and **Assessed / Paid / Unassessed** status filters, with a Clear control.
    Totals recompute against the active filter.
  - **Row click opens the award breakdown** — market value → First Schedule
    multiplier → assets → solatium → interest → total, each line annotated with
    how it was derived, plus assessed-by/on and paid-on. Laid out in statute
    order so a figure can be checked line by line rather than asserted.

Verified in-browser: searching `101/` narrows 535 → 6 parcels; the dialog opens
with the full breakdown.

## Phase 3 — console shell now matches the public portal

The token remap in Phase 1 fixed the *colours*, but the console was still
structurally a generic admin panel: one cramped blue bar, no emblem, and it
introduced itself as "National Land Acquisition & Management System" while the
public site called itself "Tamil Nadu Government Land Management System".

- New `components/gov-emblem.tsx` — the portal emblem extracted from
  `PublicHeader` so both shells use one mark.
- New `components/app-nav.tsx` — console nav built from the public portal's own
  `.main-nav` / `.nav-item` / `.dropdown-panel` classes, with active-route
  highlighting, so it is literally the same bar rather than a lookalike.
- `app/layout.tsx` rebuilt around `.site-header` + that nav, same 1240px
  measure as the landing page, plus a "Public Portal" link back out.

### Two logic errors fixed at the same time
- **"Developer API" removed from the officer's More menu.** It is the public,
  unauthenticated open-data documentation page — it does not belong inside a
  government console.
- **"Field Verification" no longer shown to the District Collector.** It is the
  mobile on-site parcel-marking tool; a Collector approves, they do not walk the
  alignment with a handset. The nav entry is now field-role only. District keeps
  the `parcel:update-status` permission and can still change parcel status from
  the project workspace, so nothing is actually lost.
---

## Phase 4 — parcel editor, voice assistant, dead UI

### Parcel / alignment editor
Drawing a boundary previously gave you a road map, no coordinates, and no way
to record which parcel you had just drawn.
- **Satellite basemap** with a toggle. (First attempt inserted the raster layer
  *below* the vector style — invisible, because the OpenFreeMap style's first
  layer is an opaque background fill. It is now added on top of the basemap and
  below the draft geometry.)
- **Live coordinate readout** under the cursor in decimal degrees, plus an
  expandable list of every placed point and the computed extent.
- **Survey No. and Patta No. fields.** `createParcel` already persisted both,
  but the API route never accepted them, so every parcel drawn in the UI was
  saved with a null survey number — unidentifiable in a land record. The route
  now accepts and forwards them.
- `cancelDraw` clears the identifier fields; it also runs after a successful
  save, so previously a survey number would have carried into the next parcel.

Verified: three points placed on satellite imagery, extent computed
(102.3578 ha), coordinates reading 18.716014° N, 82.617462° E.

### Voice assistant restored
`voice-chatbot.tsx` implemented the whole spec'd feature — Web Speech API in and
out, real lookups against `/api/public/projects` — and **was never imported by
anything**. The widget actually on the site was a different component with five
canned replies and no voice, mounted only on the landing page.
- Logic extracted to `lib/voice-assistant.ts`; the orphan deleted.
- The **existing styled widget keeps its exact visual design** (`.chat-fab`,
  `.chat-window`, …) and gains a mic button, spoken answers, and real project
  lookup. It speaks only when asked by voice, never when typed.
- Mounted in the public **layout**, so it is on every public page as specified.
- Fixed a real race: a question asked before the project list finished loading
  was answered "I couldn't find a project matching that" against an empty array.
  The in-flight fetch is now awaited.

Verified: present on `/`, `/projects`, `/compensation`, `/track`, `/grievances`;
"status of the sivaganga canal project" → correct stage and next step.

### Dead dashboard buttons
"Draft Notice / Disburse Fund / Legal Review / Assign Survey" were four
decorative `<button>`s with **no onClick**. Replaced with real
permission-gated links to the screens that do the work, so a role only sees
shortcuts it can actually use.

### Tamil coverage
Tamil was hardcoded inline and existed only on the public pages and the
dashboard — the entire project workspace and every other console page was
English-only, and `.ta` was only defined *inside* `.sec-title`, so Tamil text
elsewhere wasn't even getting the Tamil font.
- `.ta` now defined globally → Noto Sans Tamil everywhere.
- New `lib/i18n.ts`: one shared vocabulary (~90 domain terms in TN Revenue
  Department usage) + `components/bilingual.tsx`, which looks the Tamil half up
  rather than taking it as a prop, so a term reads identically everywhere and
  degrades to English-only when an entry is missing.
- Applied to the workspace section titles (14) and the compensation table.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm test` | 33 files, 228 tests passing |
| All `/app` routes × central/district/field/agency | every route 200 |
| Public routes | all 200, assistant present on each |

## Phase 5 — two inconsistencies closed

- **3D view opened to every project.** It was hard-gated to one hardcoded
  project id in *two* places (the route and the workspace card), so every other
  project 404'd — which reads as "3D is broken" rather than "3D is scoped".
  Nothing in the view is project-specific: the terrain DEM and satellite drape
  are global layers and `Project3DView` takes alignment and parcels generically.
  The gate is now the actual requirement — the project must have geometry to
  drape. Verified rendering on a project that previously 404'd.
- **Audit columns show names, not ids.** `assessedBy` / `setBy` were rendering
  raw strings like `u-district-1`. New `db/users.ts` resolves the (six-row) user
  table once per request and maps ids to names.

## Still outstanding

Being explicit about what this pass did **not** cover:

1. **Other tables need the compensation treatment.** Families, tenders,
   documents, land bank, legal disputes and the grievance queue still lack
   search, filters and row drill-down. The compensation panel is the pattern to
   copy — widen the data at the page level, then add search/filter/detail.
2. **Tamil coverage is partial** — the vocabulary and component are in place and
   applied to the workspace section titles and the compensation table, but the
   other console pages (reports, workload, conflicts, encroachment, contractors,
   land bank) are still English-only. Extending it is now a matter of wrapping
   labels in `<Bilingual>`, not translating from scratch.
3. The public **"தமிழ் | English" header control is static text**, not a working
   language switch. The portal shows both languages together, so this is a
   labelling question rather than a missing feature — but as written it implies
   a switch that does not exist.

## Final verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm test` | 33 files, 228 tests passing |
| All `/app` routes x central/district/field/agency | every route 200 |
| All public routes | 200, assistant present on each |
| 3D on 4 different projects | all 200, renders |
