# Project Status — National Land Acquisition & Management System

**Last updated:** 2026-08-30 (autonomous session, see [[autonomous_full_build_directive]] memory)

Tracks implementation status against `docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md` Section 6 (Feature List). Update this file whenever a feature's status changes — it's the fastest way for a new session to see what's real without re-deriving it from commit history.

Legend: ✅ done & verified · 🚧 partial · ⬜ not started. Priority tags (🟢 P0 / 🟡 P1 / ⚪ P2) are the parent spec's, unchanged.

## 6.1 Core Lifecycle Workflow
- ✅ 🟢 Full state machine, stage-gated permissions
- ✅ 🟢 Multi-level approval chain (District → State → Central)
- ⬜ 🟡 Configurable workflow per acquisition type (Section 40 urgency clause)
- ⬜ 🟡 SIA stage with Expert Group review / cancellation-recommendation path
- ⬜ 🟡 Public hearing / objection window (Section 21), objections logged
- ⬜ ⚪ Gram Sabha consultation record

## 6.2 Compensation & R&R
- ✅ 🟢 Compensation calculator (Section 26-30 formula)
- ✅ 🟢 Per-parcel compensation & disbursement tracking
- ✅ 🟡 R&R Award workflow (6-step Chart 5.1)
- ✅ 🟡 **Second Schedule entitlement tracker per household** (`src/db/families.ts`, `src/lib/entitlements.ts`, families panel on project detail page) — built this session
- ✅ 🟡 **Third Schedule infrastructure checklist per R&R colony** (`src/db/infrastructure.ts`, 18-item checklist auto-created at POSSESSION+, tracked per project) — built this session
- ✅ 🟡 **Versioned entitlement-rate table** — the underlying `compensation_rates` table was already append-only; added `listCompensationRatesWith` + a "Rate history" panel so past revisions (who/when/what) are now actually visible, closing the CAG-audit-cited transparency gap — built this session
- ⬜ 🟡 Dispute/appeal workflow
- ⬜ ⚪ Mock bank/PFMS disbursement trail
- ⬜ ⚪ Record of Rights (RoR) issuance tracking

## 6.3 GIS & Spatial
- ✅ 🟢 Interactive map, geo-tagged parcels, click-through
- ✅ 🟢 Project alignment/footprint overlay
- ✅ 🟢 **Layer toggle: alignment, parcels, impact buffer; status-based color coding (NOTIFIED/ACQUIRED/POSSESSED)** — rebuilt this session, was previously only impact-boolean-colored with no toggles/legend
- ✅ 🟡 Auto-computed impact (buffer-distance highlighting)
- ⬜ 🟡 Before/after imagery slider
- ⬜ 🟡 Elevation/terrain profile
- ⬜ ⚪ Flagship 3D visualization
- ⬜ ⚪ QR code per parcel
- ⬜ ⚪ Geo-tagged field photos on map

## 6.4 Documents
- ✅ 🟢 Secure repository, version history, audit trail
- ✅ 🟢 DPR & design/blueprint upload
- ✅ 🟢 **Auto-generated official documents (notification, declaration, award letter, possession certificate) — PDF export** (`src/lib/generated-documents.ts`, pdf-lib) — built this session
- ✅ 🟡 **Document checklist per stage with missing-doc flags** (`src/lib/document-requirements.ts`, badges on project detail page) — built this session
- ⬜ ⚪ E-signature stub

## 6.5 Dashboards & Reporting
- ✅ 🟢 National dashboard, state-wise/project-wise drill-down
- ✅ 🟢 SLA/timeline health — now **4** statutory deadlines (declaration, compensation, R&R award, and the 18-month infrastructure metric added this session against real Third Schedule checklist data)
- ⬜ 🟡 Customizable MIS report builder
- 🚧 🟡 Cross-state/cross-project comparison view — the central dashboard's state-breakdown table (`getStateBreakdown`, pre-existing) already covers cross-*state* comparison; side-by-side cross-*project* comparison is not built
- ⬜ ⚪ Escalation matrix (auto-flag + notify on SLA breach)

## 6.6 Field & Mobile
- ✅ 🟢 **Mobile-responsive verification screens** (`/app/field`, parcel NOTIFIED→ACQUIRED→POSSESSED progression, one-thumb single-column layout, large tap targets) — built this session; previously the `field` role had no dedicated UI or any real action to perform
- ⬜ 🟡 PWA offline mode

## 6.7 Notifications & Comms
- ✅ 🟢 **In-app notification center** (`src/db/notifications.ts`, bell dropdown with unread badge, scoped to visible projects) — built this session
- ⬜ 🟡 Email alerts (Resend)
- ⬜ ⚪ SMS stub

## 6.8 Public / Transparency Portal
- ✅ 🟢 **No-login public view: project status, notices, aggregate stats** (`/`, `/projects/[id]`) — built this session; portal is now the landing page, internal dashboard moved to `/app`
- ⬜ 🟡 Landowner self-service (claim status, upload objection/document)
- ⬜ 🟡 Grievance/RTI-style ticket submission + tracking number

## 6.9 Platform-level
- ✅ 🟢 RBAC enforced server-side
- ✅ 🟢 Full audit log (stage_history, rr_stage_history)
- ✅ 🟡 **Global search across projects/parcels/families** (`src/db/search.ts`, header search bar) — built this session
- ⬜ 🟡 Multi-language UI (next-intl)
- ⬜ ⚪ "Interoperability" mock-API-contracts page
- 🚧 ⚪ Accessibility pass — one earlier pass done (commit `31c5b2f`), not re-run since this session's visual redesign

## Section 7 — UX Features
- ✅ Role-aware landing, breadcrumb/stage indicator, SLA badges on lists, toast confirmations, multi-step forms w/ validation, permission messaging, "last updated by" — all pre-existing
- ✅ **Full visual/UX redesign this session**: warm-parchment/navy/sandstone palette, Source Serif 4 + IBM Plex Sans/Mono type system, masthead headers, official-seal current-stage badge, retinted chart/map colors — see commits `63d6f5c`..`dd5f8c5`
- ✅ Field verification screens: one-thumb mobile use (built this session, see 6.6)
- 🚧 Command palette — global search bar built (6.9) but not a literal Cmd/Ctrl+K palette overlay
- ⬜ Empty states that teach, smart defaults, drag-drop document upload w/ thumbnails, customizable dashboard widgets, saved filters/views, plain-language public summaries, offline banner for field officers
- ⬜ ⚪ Demo role-switcher already exists (pre-existing `RoleSwitcher`) — undo window, high-contrast toggle, notification preferences, "my data" export not built

## Seed data realism (found and fixed this session)
User flagged that the map's parcels were 2-3 hand-typed arbitrary boxes per project with no relationship to the alignment or any land-record logic — a legitimate demo-credibility gap, not a UI bug. Fixed:
- `src/lib/parcel-generation.ts`: real procedural generation — corridor projects get a ribbon of parcels along the actual alignment at a real 45m highway ROW width; area-footprint projects get a grid at India's actual average agricultural holding size (~1.2ha). Deterministic (seeded PRNG).
- Reseeded: ~2,200 parcels total across 8 projects (up from ~17), 1,486 real compensation records.
- Had to convert `CompensationPanel` and the field-verification page from card-per-parcel lists to paginated tables/lists — neither survived a 600-parcel project.
- Had to fix `src/lib/generated-documents.ts`'s PDF generator, which had no page-overflow handling and would have silently drawn most of a 600-item parcel list off the bottom of a single page — now paginates real PDF pages and caps itemization at 40 with a summary note beyond that.
- Verified: build clean, 171 tests passing, page loads under 1s even for the heaviest (600-parcel) pages.

## Bugs fixed this session (found incidentally, not spec items)
- `next-themes` `useTheme()` called with no `ThemeProvider` ancestor in `sonner.tsx` — was producing a console error on every page load. Fixed by removing the unused hook call (app is light-only).
- `toLocaleString()`/`toLocaleDateString()` called with no locale argument in 5 places — classic SSR/client hydration mismatch risk (server OS locale vs. browser locale). Fixed via `src/lib/format.ts` pinning `en-IN`/`Asia/Kolkata` explicitly.

## What a fresh session should do first
1. Read this file, then `git log --oneline -30` to confirm nothing has drifted.
2. Run `npm run test && npx tsc --noEmit && npm run build` to confirm the tree is still green.
3. Pick up the next ⬜ item in priority order (P1 before P2), following the same pattern every feature above used: brainstorm only for genuinely architectural pieces (new tables/entities), otherwise TDD directly; always `npm run db:push` after a schema change; always verify end-to-end against the running dev server (or a prod build, since this Next.js version's dev mode has a known first-hit-after-cold-compile hydration flake — see commits around `dd5f8c5`/`8e0cc56` for how to tell that apart from a real bug) before calling something done.
4. Update this file's checkboxes as you go.
