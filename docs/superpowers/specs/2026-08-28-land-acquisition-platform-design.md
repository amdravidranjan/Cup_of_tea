# National Land Acquisition & Management System — Design Doc

**SIH Problem Statement 26016** — Ministry of Rural Development, Dept. of Land Resources (DoLR)
**Status:** Draft, pending user review
**Date:** 2026-08-28
**Scope of this doc:** Internal-hackathon (1-week) demo build. Real hackathon build-out is a later phase.

---

## 1. Constraints

- **Timeline:** 1 week to qualify the internal round. Real SIH hackathon (longer runway) comes after, if selected.
- **Team:** 6 people — 4 average skill, 2 low skill (frontend/React).
- **Evaluation:** PPT + **live working demo**. Judges will click through the app themselves — nothing can be fake in a way that breaks under interaction.
- **Strategy (user's framing):** feature breadth is a deliberate weapon — "if we can't win by finesse, brute force." But every feature shown must actually work; a broken feature is worse than an absent one. AI/ML features (predictive analytics etc., mentioned in the PS) are explicitly deferred to a later phase — this doc covers non-AI scope only.

---

## 2. Research Findings

This section documents what we found about how land acquisition actually works in India today, so the app's workflow and data model are grounded in the real process rather than invented. Full sources are cited inline.

### 2.1 Governing law: RFCTLARR Act, 2013

The **Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013** is the central statute. Key mechanics:

- **Section 11 — Preliminary Notification.** The acquisition process legally begins here. Market value for compensation is fixed as of this date (Section 26 proviso). [[Preliminary notification under Section 11]](https://rtdchp.org/wp-content/uploads/2023/03/Preliminary-notification-under-section-11-of-RFCTLARR-Part-1-Eng.pdf)
- **Section 19 — Final Declaration** must be published within **12 months** of the Section 11 notification, or the notification lapses.
- **Section 4(2)** — SIA study notification date is the anchor for interest calculations (see below).
- **Section 26–30 — Compensation formula:**
  - Market value = highest recorded sale-deed value of comparable land in the vicinity in the **preceding 3 years** (Section 26).
  - Plus value of all assets attached to the land (Section 27).
  - Plus a **rural multiplier factor** (up to 4× market value in rural areas; urban land generally gets no multiplier but has a higher base market value).
  - Plus **Solatium**: minimum **100%** of the total compensation amount (Section 30(1)).
  - Plus **12% p.a. interest** on market value, from the SIA notification date (Section 4(2)) until the Collector's award or possession, whichever is earlier (Section 30(3)).
  - [[Compensation Rules Sections 26–30 — ApniLaw]](https://www.apnilaw.com/legal-articles/acts/compensation-rules-for-landowners-under-the-2013-act-sections-26-30-explained/), [[Solatium ruling — LiveLaw]](https://www.livelaw.in/top-stories/solatium-us-30-rfctlarr-act-146492)
- **Section 38** — Collector may take possession only after **full payment** of compensation and R&R entitlements: monetary compensation within **3 months** of award, monetary R&R entitlements within **6 months**, infrastructural R&R entitlements (Second/Third Schedule) within **18 months**.
- **Second Schedule** — R&R entitlements per affected/displaced family: housing unit (rural: Indira Awas Yojana spec; urban: ≥50 sq. m plinth area) or land-for-land (irrigation projects); choice of one-time lump sum or annuity/employment; subsistence grant (1 year) + transport allowance for displaced families; one-time grant for artisans/small traders/cattle-shed or petty-shop loss; resettlement allowance; stamp duty/registration fee waiver on any replacement land.
- **Third Schedule** — infrastructure/amenities the Collector must ensure at every resettlement colony: roads, drainage, drinking water, grazing land, fair-price shop, Gram Panchayat Ghar, post office, irrigation facility, transport facility, burial ground, playground, electricity, school, Anganwadi centre, public health centre, community centre, place of worship, veterinary centre.
- [[Second Schedule text — indiacode.nic.in]](https://upload.indiacode.nic.in/schedulefile?aid=AC_CEN_18_43_00003_201330_1517807327433&rid=324), [[CAG Audit Report Ch. 5 — R&R]](https://cag.gov.in/uploads/download_audit_report/2024/16.Chapter-5---Copy-066e27b7bea1651.80544595.pdf)

### 2.2 Social Impact Assessment (SIA)

Mandatory pre-acquisition study under the RFCTLARR (SIA and Consent) Rules, 2014:

- Conducted by an **SIA Unit**, in consultation with local Panchayats/Municipalities.
- Report (Form 2) covers: project & affected-area description, baseline socio-economic/demographic data, identification of affected families and vulnerable groups, land/livelihood impact analysis, consultation records, proposed mitigation/rehabilitation measures, grievance mechanism, environmental baseline, risk assessment.
- Reviewed by an **independent Expert Group**, which can recommend the project be **cancelled** if social cost outweighs public benefit — this is a real veto point, not a rubber stamp.
- Requires **Gram Sabha** consultation/consent for rural acquisitions.
- [[CAG Audit Report Ch. 3 — SIA]](https://cag.gov.in/uploads/download_audit_report/2024/12.-Chapter-3---Copy-066e27b7be6eaf4.07509376.pdf), [[SIA critical analysis — SAGE]](https://journals.sagepub.com/doi/10.3233/RED-151206)

### 2.3 R&R Award workflow (verbatim, from CAG audit Chart 5.1)

This is the **actual, official** 6-step R&R process — used directly as our workflow state machine rather than an invented one:

1. **Survey** of affected families by the Sub-Collector (R&R Administrator), triggered after the Section 11 notification.
2. Sub-Collector **drafts the R&R Scheme** — entitlements listed per landowner and per livelihood-loser.
3. Draft Scheme **published locally**, objection window opens, **public hearing** held by the Sub-Collector.
4. Draft Scheme + a report on claims/objections raised **submitted to the Collector**.
5. **Collector + R&R Committee** (constituted under Section 45) review the scheme, forward to the **Commissioner R&R** for Government approval.
6. Final R&R Scheme **published with Section 19 declaration**, R&R Award passed, benefits paid by the Collector.

### 2.4 What a real proposal actually contains (DPR)

Before any acquisition proposal, the requiring body prepares a **Detailed Project Report (DPR)**. Standard DPR contents: project background & public-purpose justification, technical parameters/design standards, **site investigation reports** (soil, hydrology, traffic, utility surveys), **proposed design — schematic/preliminary drawings**, Bill of Quantities & cost estimates, implementation schedule/milestones, a **land acquisition & resettlement plan** (including Right-of-Way requirements for linear projects), environmental/social impact assessment, financial analysis (NPV/IRR/cost-benefit), funding pattern.

→ This directly confirms the user's proposed feature: **project design/blueprint drawings and a georeferenced alignment are real, standard inputs to a proposal** — not an invented enhancement. [[DPR — Detailed Project Report, esurveying.net]](https://esurveying.net/land-acquisition-software/detailed-project-report)

### 2.5 Existing precedent: Bhoomi Rashi Portal

**bhoomirashi.gov.in**, built by the Ministry of Road Transport & Highways for **NHAI highway projects only**, mandatory since 1 April 2018:

- Draft LA notifications submitted online by the state's **Competent Authority for Land Acquisition (CALA)**.
- Approved by the Ministry, then auto-routed to the **e-Gazette** for publication.
- Compensation paid **directly via PFMS** (Public Financial Management System) bank transfer.
- Covers a **location hierarchy** of 728 districts, 6,763 sub-districts/tehsils, 662,668 villages via dropdown.
- Reduced notification processing time from months to **under 2 weeks** in most cases.
- [[PIB — Bhoomi Rashi]](https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=184743), [[RFCTLARR Act full text — bhoomirashi.gov.in]](https://bhoomirashi.gov.in/auth/revamp/la_act.pdf)

**Pitch framing:** our platform is Bhoomi Rashi's model, **generalized beyond NHAI/highways to every central ministry, state government, and acquisition type** — which is exactly what PS 26016 asks DoLR to build. This is a concrete, citable answer to "why does this need to exist," not a generic pitch.

### 2.6 Real evidence of the problem (CAG audit findings)

From the same CAG audit of RFCTLARR implementation in Odisha — real, citable numbers for the pitch deck's "problem" slide:

- **2,208** affected/displaced families never paid **₹176.51 crore** in entitled R&R benefits.
- In four projects, **2,390** displaced families received no R&R benefits **5 to 60 years** after displacement.
- **1,915** families were underpaid by **₹10.28 crore** because a biennial entitlement-rate revision wasn't applied in time.
- R&R colonies built but left **vacant/vandalized** because resident consent wasn't obtained before construction.
- **640** displaced families never received their Record of Rights (RoR) for allotted resettlement plots.
- Third Schedule infrastructure (drainage, drinking water, schools, primary health centres) **missing or defunct** at numerous surveyed R&R colonies.

Every one of these is a **coordination/tracking failure**, not a policy failure — i.e. exactly the class of problem a digital system with audit trails, SLA tracking, and versioned entitlement rates is built to prevent. [[CAG Audit Report Ch. 5]](https://cag.gov.in/uploads/download_audit_report/2024/16.Chapter-5---Copy-066e27b7bea1651.80544595.pdf)

---

## 3. Architecture

### 3.1 Why Next.js (not Next.js *vs.* React — Next.js *is* React)

The real choice was Next.js vs. plain React (Vite/CRA) + a separate backend service. This app needs a real backend (workflow persistence, DB writes, file uploads, auth-gated routes), and Next.js keeps frontend + API routes + server components in **one repo, one deploy**, on Vercel — critical for 6 people of mixed skill coordinating in a week, vs. standing up and deploying a second Express/FastAPI service as a separate moving part.

### 3.2 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router), Vercel Fluid Compute (Node runtime) | React + routing + API routes + one-command deploy |
| Database | Postgres via Neon (Vercel Marketplace), PostGIS extension | Real persistence; PostGIS for geo queries (buffer/impact calc) |
| ORM | Drizzle or Prisma | Type-safe schema, fast to onboard mixed-skill team |
| Auth | Clerk | Fast RBAC-friendly setup; role stored as a custom claim |
| Maps | MapLibre GL + GeoJSON in Postgres | Open-source, no vendor key required for base demo |
| UI | shadcn/ui + Tailwind | Copy-in components, fast for a mixed-skill team, easy to keep visually consistent |
| Charts | Recharts | Dashboards, SLA/trend visualizations |
| File storage | Vercel Blob | Document repository, design/blueprint uploads |
| Email | Resend | Stage-change and SLA-breach notifications |

### 3.3 Approach chosen: single monolith, real DB, seeded national-scale data

Considered and rejected: (a) multi-app microfrontends per role — too much deploy/coordination overhead for 1 week; (b) frontend-only with static/mocked JSON — collapses the moment a judge tries an action that should persist (e.g. "approve this proposal") and nothing saves. **Chosen:** one Next.js app, one Postgres DB, real workflow persistence and RBAC for every core action; national-scale numbers (state totals, historical trends) are seeded once as synthetic data rather than faked per-request, so dashboards are alive and drill into real records without pretending to have actual nationwide land data.

---

## 4. Roles & RBAC (proposed — not yet confirmed by user)

| Role | Scope |
|---|---|
| Central Ministry (DoLR) | National dashboard, cross-state analytics, final sign-off on certain approvals |
| State Government | State dashboard, reviews/approves district proposals, state-wide progress |
| District Authority / Land Acquiring Authority (maps to real-world Collector/LAO/CALA) | Creates proposals, runs notification → award → possession, manages compensation for their district |
| Project Implementing Agency | Submits project/land requirements (incl. DPR, design drawings), tracks own project status |
| Field/Verification Officer | Mobile-first: on-ground verification, geo-tagging, photo upload, possession/R&R status updates |
| Public/Citizen (no login) | Read-only transparency portal: project status, notices, grievance submission |

RBAC enforced **server-side** (API-layer checks), not just hidden UI — this is both a security requirement and a governance credibility signal for a govt-facing system.

---

## 5. Core Workflow (state machine)

Derived directly from Section 2 research, not invented:

```
Proposal Draft (DPR + design drawings + alignment/footprint geometry uploaded)
  → Scrutiny (District)
  → SIA study (SIA Unit conducts assessment → Expert Group review → can recommend cancellation)
  → Section 11 Preliminary Notification (public objection window + public hearing)
  → Approval chain: District → State → Central (approve / reject / return-for-revision at each level)
  → Section 19 Final Declaration (must be within 12 months of Section 11, else lapses)
  → Award (compensation calculated per Section 26–30 formula)
  → R&R Scheme (the 6-step Chart 5.1 sub-workflow: survey → draft scheme → publish+hearing → submit to Collector → Committee review → final publish+award)
  → Compensation disbursement (must complete within 3 months of award)
  → Monetary R&R entitlements disbursed (within 6 months)
  → Possession (only after full compensation + R&R payment, per Section 38)
  → Infrastructural R&R entitlements / resettlement colony build-out (within 18 months, tracked against Third Schedule checklist)
```

Every stage transition is logged to an immutable audit trail (who, when, what changed) — this is the direct answer to the CAG audit's core finding pattern (stale rates applied, missing RoR handover, unverified consent).

---

## 6. Feature List

Priority legend: 🟢 P0 (must work live in the demo) · 🟡 P1 (build if time allows) · ⚪ P2 (stub/mock — visible, not fully wired)

### 6.1 Core Lifecycle Workflow
- 🟢 Full state machine above, stage-gated permissions
- 🟢 Multi-level approval chain (District → State → Central): approve / reject / return-for-revision
- 🟡 Configurable workflow per acquisition type (e.g. Section 40 urgency clause skips steps)
- 🟡 SIA stage with Expert Group review and cancellation-recommendation path
- 🟡 Public hearing / objection window (Section 21) — objections logged against a notification, resolved before award
- ⚪ Gram Sabha consultation record (rural acquisitions)

### 6.2 Compensation & R&R
- 🟢 Compensation calculator implementing the real Section 26–30 formula: market value × rural multiplier + solatium (100% min) + 12% p.a. interest from SIA notification date
- 🟢 Per-family compensation & disbursement tracking (assessed vs. paid vs. pending), against the 3-month statutory deadline
- 🟡 R&R Award workflow = the literal 6-step Chart 5.1 process (Section 2.3)
- 🟡 Second Schedule entitlement tracker per household (housing/land, annuity-or-employment choice, subsistence grant, artisan/trader one-time grant, resettlement allowance)
- 🟡 Third Schedule infrastructure checklist per R&R colony (roads, drainage, drinking water, school, Anganwadi, health centre, etc. — verbatim list from 2.1)
- 🟡 **Versioned entitlement-rate table** (effective-date ranges, admin-managed) — directly closes the audit's #1 documented failure (stale rates applied after a biennial revision)
- 🟡 Dispute/appeal workflow — landowner objects to award amount, routes to review queue
- ⚪ Mock bank/PFMS disbursement trail (reference numbers, status only)
- ⚪ Record of Rights (RoR) issuance tracking for allotted resettlement plots

### 6.3 GIS & Spatial (user's blueprint/visualization idea, validated by DPR research in 2.4)
- 🟢 Interactive map, geo-tagged parcels, click-through to parcel/project detail
- 🟢 **Project alignment/footprint overlay**: every project stores a real geometry (line for linear projects like a bridge/highway/rail, polygon for area projects like a dam/industrial park), rendered distinct-styled from the acquired-parcel layer
- 🟢 Layer toggle: cadastral boundary, alignment/corridor, affected villages, notified/acquired/possessed status (color-coded)
- 🟡 **Auto-computed impact**: parcels/villages within a buffer distance of the alignment auto-highlighted, rolled into the affected-families count (ties GIS directly to the R&R module instead of manual entry) — corresponds to the real Right-of-Way plan in a DPR
- 🟡 Before/after imagery slider (satellite image today vs. planned alignment overlay)
- 🟡 Elevation/terrain profile for linear projects, alongside the map
- ⚪ **One flagship 3D visualization** (e.g. the user's bridge example) — 3D terrain + placed model via MapLibre 3D extrusion, as a single polished showcase rather than a generic feature across all project types
- ⚪ QR code per parcel — scan pulls up the record
- ⚪ Geo-tagged field photos pinned on the map at exact capture location

### 6.4 Documents
- 🟢 Secure repository, version history, per-document audit trail
- 🟢 **DPR & design/blueprint upload** at proposal creation — schematic drawings, site investigation reports (this is the source artifact feeding 6.3's alignment overlay/3D visualization)
- 🟢 Auto-generated official documents (notification, award letter, possession certificate) from templates — PDF export
- 🟡 Document checklist per stage with missing-doc flags (blocks progression until complete)
- ⚪ E-signature stub on award approval

### 6.5 Dashboards & Reporting
- 🟢 National dashboard: area notified/acquired, compensation paid, families affected, R&R progress, possession status
- 🟢 State-wise and project-wise drill-down
- 🟢 SLA/timeline health (green/amber/red) computed against the **real statutory deadlines** (12 months to Final Declaration, 3 months to compensation, 6 months to monetary R&R, 18 months to infrastructural R&R) rather than invented thresholds
- 🟡 Customizable MIS report builder (pick fields → export PDF/Excel)
- 🟡 Cross-state/cross-project comparison view
- ⚪ Escalation matrix — auto-flag + notify supervisor on SLA breach

### 6.6 Field & Mobile
- 🟢 Mobile-responsive verification screens: one-thumb use, large tap targets, dropdowns/toggles over free text
- 🟡 PWA offline mode — field officer logs data with no signal, syncs on reconnect

### 6.7 Notifications & Comms
- 🟢 In-app notification center (stage changes, assigned tasks, objections filed)
- 🟡 Email alerts (Resend) on key transitions
- ⚪ SMS stub

### 6.8 Public / Transparency Portal
- 🟢 No-login public view: project status, notices, aggregate stats
- 🟡 Landowner self-service: check claim status, upload objection/document
- 🟡 Grievance/RTI-style ticket submission + tracking number

### 6.9 Platform-level (cross-cutting)
- 🟢 RBAC enforced server-side
- 🟢 Full audit log on every record — who did what, when
- 🟡 Multi-language UI (English + Hindi minimum, via next-intl)
- 🟡 Global search across projects/parcels/families
- ⚪ "Interoperability" page: documented mock API contracts referencing Bhoomi Rashi's e-Gazette + PFMS pipeline by name (not a vague placeholder)
- ⚪ Accessibility pass (WCAG contrast/keyboard nav) via the `web-design-guidelines` skill before demo

### 6.10 Deferred (Phase 2 / AI — explicitly out of scope for this doc)
Predictive delay-risk scoring, compensation-anomaly detection, document auto-verification, chatbot assistant.

---

## 7. UX Features

- 🟢 Role-aware landing: post-login lands directly on the role's relevant dashboard
- 🟢 First-visit guided tour per role (spotlight walkthrough)
- 🟢 Persistent breadcrumb + stage indicator on every project ("Notification → Award → **Possession** → R&R")
- 🟢 Global search (project, parcel ID, family name)
- 🟢 Progress tracker visualization on every long-running item, not just a status badge
- 🟢 Color-coded SLA health visible on every list (not buried in a report)
- 🟢 Toast/inline confirmation on every action — no silent state changes
- 🟢 Multi-step forms with save-as-draft + resume + auto-save (land acquisition proposals are not filled in one sitting)
- 🟢 Inline field-level validation with specific error messages
- 🟢 Confirmation dialogs reserved for destructive/irreversible actions only
- 🟢 Clear permission messaging ("You need State-level approval to edit this") instead of silently-disabled buttons
- 🟢 "Last updated by X on [date]" on every record — institutional trust signal
- 🟢 Field verification screens: one-thumb mobile use, minimal typing
- 🟡 Command palette (Cmd/Ctrl+K) for power users
- 🟡 Empty states that teach (sample card + CTA, not just "no data")
- 🟡 Smart defaults (e.g. circle rate auto-populates from district selection)
- 🟡 Document upload: drag-drop, live thumbnails, progress bars
- 🟡 Customizable dashboard widgets per user
- 🟡 Saved filters/views ("My district's overdue projects")
- 🟡 Plain-language summary alongside official data on public project pages
- 🟡 Offline banner + queued-actions indicator for field officers
- ⚪ **Demo role-switcher** — one button to jump between District/State/Central/Public views without re-login (built specifically for the live-demo format)
- ⚪ Undo window (5s) on soft actions
- ⚪ High-contrast/larger-text toggle
- ⚪ Notification preferences
- ⚪ Downloadable "my data" export for a landowner's case file

---

## 8. Frontend design guidance (applies to landing/login/public portal only)

Read all skills present in `.agents/skills/`. Findings:

- **`web-design-guidelines`** (official Vercel skill): a11y/UX compliance audit — run against the built UI before demo (Section 6.9).
- **`design-taste-frontend`** and its style variants (minimalist-ui, industrial-brutalist-ui, high-end-visual-design, stitch-design-taste, gpt-taste): anti-"AI slop" rules for **landing pages/portfolios/marketing sites** — explicitly out of scope for dashboards/multi-step product UI. Applicable to: public transparency portal, login/landing page.
- **`brandkit`**: premium brand-identity deck generation (logo, palette, typography) — usable for the project's name/logo/PPT branding, not the app itself.
- **`redesign-existing-projects`, `image-to-code`, `imagegen-frontend-mobile/web`**: not applicable (no existing site to redesign, no reference image to convert).
- **`full-output-enforcement`**: general no-placeholder/no-truncation coding discipline — followed by default regardless of formal invocation.

None of these are in the registered Skill-tool list; they're applied manually as guidance where relevant, not invoked as formal skills.

---

## 9. Open Items (not yet decided)

- Final confirmation of the role set in Section 4 (proposed, not yet approved by user)
- Team/module assignment across the 6 people (2 low-skill members likely best suited to: seed data/content, demo script/QA, public portal + brand/PPT work using the design-taste guidance in Section 8)
- Data model detail (entity/field-level schema) — to be produced in the implementation plan, not this doc
- Testing approach and demo script — not yet discussed
- Exact scope decision on the P2 3D visualization vs. reallocating that effort to the before/after slider + elevation profile

---

## 10. Sources

- [Preliminary notification under Section 11 of RFCTLARR](https://rtdchp.org/wp-content/uploads/2023/03/Preliminary-notification-under-section-11-of-RFCTLARR-Part-1-Eng.pdf)
- [RFCTLARR Act, 2013 full text — bhoomirashi.gov.in](https://bhoomirashi.gov.in/auth/revamp/la_act.pdf)
- [Compensation Rules for Landowners Under the 2013 Act: Sections 26–30 — ApniLaw](https://www.apnilaw.com/legal-articles/acts/compensation-rules-for-landowners-under-the-2013-act-sections-26-30-explained/)
- [Solatium U/S 30 RFCTLARR Act — LiveLaw](https://www.livelaw.in/top-stories/solatium-us-30-rfctlarr-act-146492)
- [Second Schedule — indiacode.nic.in](https://upload.indiacode.nic.in/schedulefile?aid=AC_CEN_18_43_00003_201330_1517807327433&rid=324)
- [CAG Audit Report — Chapter 3, Social Impact Assessment](https://cag.gov.in/uploads/download_audit_report/2024/12.-Chapter-3---Copy-066e27b7be6eaf4.07509376.pdf)
- [CAG Audit Report — Chapter 5, Rehabilitation and Resettlement](https://cag.gov.in/uploads/download_audit_report/2024/16.Chapter-5---Copy-066e27b7bea1651.80544595.pdf)
- [Social Impact Assessments under the RFCTLARR Act, 2013: A Critical Analysis — SAGE](https://journals.sagepub.com/doi/10.3233/RED-151206)
- [Detailed Project Report (DPR) — Land Acquisition, esurveying.net](https://esurveying.net/land-acquisition-software/detailed-project-report)
- [PIB — Bhoomi Rashi Portal changed land acquisition process](https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=184743)
- [PIB — 1467 NHAI projects on Bhoomi Rashi Portal](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1988572&reg=48&lang=2)
