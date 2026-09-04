# Cup_of_tea — Full Feature Reference

A complete list of everything built in this system, organized by who it's
for. Each feature notes **what's real** (backed by an actual database and
working logic) versus **what's simulated** (no external provider wired up —
telephony, SMTP, SMS gateways, satellite imagery, and real machine-learning
models are all out of scope for a project like this, so those are built as
clearly-reasoned, deterministic demo logic instead of pretending to call a
service that doesn't exist).

---

## 1. Public Portal (no login required)

| Feature | Where | Notes |
|---|---|---|
| Landing page — portfolio stats, project search, recent notices | `/` | Real, live data |
| Project detail — stage, map, before/after imagery, elevation profile, SLA health | `/projects/[id]` | Real |
| File a grievance (general objection or compensation dispute) | On project detail page | Real, issues a tracking number |
| Track a grievance by tracking number | `/track` (Grievance tab) | Real |
| **Request a project** — citizens can ask that a project be taken up | `/request-project` | Real; issues a tracking number |
| **Track a project request** by tracking number | `/track` (Project Request tab) | Real |
| **Legal disputes** on a project (read-only public record) | On project detail page | Real; shows case number, court, status, dates — no internal notes |
| **Voice-enabled status chatbot** | Floating widget on every public page | Real speech-to-text/text-to-speech via the browser's built-in Web Speech API (no external voice service) + rule-based project lookup. Falls back to text-only in browsers without Speech API support. |
| **Open Developer API** — read-only JSON endpoints for the public data | `/developers` (docs), `/api/public/projects`, `/api/public/projects/[id]`, `/api/public/stats` | Real, unauthenticated, no PII |

## 2. Internal — Every Role

| Feature | Where | Notes |
|---|---|---|
| Role-based login (demo role switcher) | Top-right of any `/app` page | Demo-only — no password, session is a signed cookie |
| Dashboard — project list, and for state/central: portfolio stats + charts | `/app` | Real |
| Global search (projects, parcels, families) | Header search bar | Real |
| Notifications bell (stage transitions, grievances, etc. relevant to your scope) | Header | Real, polls every 20s |
| Interoperability / e-Gazette & PFMS API contract docs | `/app/interoperability` | Static reference documentation |

## 3. Project Detail Workspace (`/app/projects/[id]`)

The main internal workspace. Organized as a dark stage-progress header, a
white project-identity section, and seven tabs.

### Overview tab
- Stage tracker with real month/year dates per stage (from stage history), animated fill
- **AI Risk Assessment** — a 0–100 score with a color-zoned gauge and a needle. *Real, transparent computation* (weighted formula over open grievances, SLA breaches, vulnerable-family share, unpossessed land, active litigation) — explicitly not a trained model, every factor is shown.
- Interactive map — real MapLibre map, real project geometry, parcel-status coloring, satellite toggle, dual-line canal styling for alignments, impact-buffer toggle, legend
- Alignment/parcel drawing tool (for roles that can edit geometry) — draw a new alignment or a new parcel boundary directly on the map
- Before/after imagery slider
- 3D terrain view (one flagship project)
- Elevation profile (route-type projects)
- Full stage-transition history log

### Compensation tab
- **AI Land Rate Prediction** — predicted ₹/hectare with a range and reasoning. *Real, deterministic formula* (current notified rate + time-since-revision + local demand + regional variance) — not a trained model.
- Current official compensation rate + history, settable by district/state
- Per-parcel compensation table (paginated), mark-as-paid action
- Blocked automatically if a court stay order is active on the project (see Legal tab)

### R&R & Families tab
*(shown once the project reaches its R&R stage)*
- R&R sub-workflow stage, history, and next-step actions — tells you which role needs to act when you can't
- Affected families list with entitlements, register/grant actions
- **Succession / heir-splitting** — mark a family's head of household deceased and split their entitlement across named heirs with shares. Real.
- Rehabilitation facilitation tracker — skill training, job placement, housing allotment, transport assistance, counseling, with status progression. Real.

### Infrastructure tab
*(shown once the project reaches possession)*
- Resettlement-colony infrastructure checklist (roads, water, electricity, etc.), mark-complete action
- **Land bank register** — flag a parcel as acquired-but-unused (e.g. if a project descopes) and track its status (idle → under review → repurposed/disposed). Real.

### Legal tab
- Legal disputes list — case number, court, status, filed/hearing dates
- **Stay-order enforcement** — flagging a case as a stay order *actually blocks* compensation-pay and parcel-possession actions on the project until it's logged as cleared. This is real, working enforcement, not just a label.

### Tenders tab
- Tenders published for the project — number, scope, estimated value, status
- Award flow (pick an existing contractor or add a new one), status progression (published → awarded → in progress → completed)
- Contractors are browsable separately at `/app/contractors`, each with a full history of every tender they've won across every project (the "see their past projects" requirement)

### Community tab
- **Gram Sabha (village council) consultation records** — date, village, attendance count, minutes, and resolution, tied to the project. Real, structured record — not just a free-text form.
- **Multi-channel notifications to affected families** — voice call, email, SMS, and postal notice, each logged with a status. *Voice/Email/SMS are simulated* (no telephony/SMTP/SMS provider is connected — this is a demo). *Postal is the one channel with something real behind it*: it can carry an id of a real generated PDF document, plus a real tracking-id field and delivery-status field that staff update once the physical notice is actually sent.

### Documents tab
- Document checklist (required vs. uploaded), upload form, auto-generate statutory documents
- Full document table with per-document download
- **AI document extraction** — an expandable "what did we read off this file" disclosure per document, with a confidence score per field. *Real for text-layer PDFs generated by this app's own document pipeline; a deterministic, clearly-reasoned stand-in (not a trained OCR/vision model) for anything else*, since no OCR service is connected.
- **AI-drafted citizen notices** — a template-based first draft of plain-language notice text, generated from the project's real data. *Not an LLM call* — a template generator — but genuinely useful text a human still must review and explicitly approve before anything is considered final (mandatory human-in-the-loop; nothing is ever auto-sent).

## 4. Oversight & Cross-Project Tools (state/central/district, via the "More" menu)

| Feature | Where | Notes |
|---|---|---|
| Grievances review queue | `/app/grievances` | Real |
| Project Requests review queue (approve/reject public requests) | `/app/project-requests` | Real |
| MIS Reports + CSV export | `/app/reports` | Real |
| Contractors directory | `/app/contractors`, `/app/contractors/[id]` | Real |
| **District Workload view** — active projects, open grievances, and SLA breach rate per district | `/app/workload` | Real computation. Grouped by *district* rather than by named officer, since this system models one login per role rather than a full staff directory — the workload data is real, the granularity is honest about what the system actually knows. |
| **Title-Chain Conflict Detector** — flags families with the same name+village registered on more than one project (the "same land compensated twice" fraud pattern) | `/app/conflicts` | Real, exact-match computation across every project's family register. Reviewers can dismiss a false positive. |
| **Encroachment Monitoring** — flags possessed parcels where "imagery" suggests a change since possession | `/app/encroachment` | *Simulated.* No live satellite feed or change-detection model exists here; this is a deterministic, seeded heuristic built the same way the risk score and land-rate predictor are, so results are stable and explainable rather than random noise dressed up as AI. |
| **Land Bank register (all projects)** | `/app/land-bank` | Real, aggregates every project's flagged entries |

## 5. Field Verification (field officers, and district)

| Feature | Where | Notes |
|---|---|---|
| Project list scoped to the officer's district, with an offline/sync indicator | `/app/field` | Real, mobile-first |
| Per-parcel status verification | `/app/field/[projectId]` | Real, works with the offline queue |

## 6. Access Control

Every internal action checks both a role permission (via `lib/rbac.ts`) and,
for anything tied to a specific project, that the project is actually in the
signed-in user's scope (their own district/state, or a project they created)
— not just their role. This applies uniformly across every feature above,
including the ones added in this pass.

## 7. What's Deliberately Not Real (and why)

Being direct about this, since it matters for anyone evaluating the system:

- **Voice calls, SMS, and email** to affected families are logged with a
  realistic status lifecycle but nothing is actually dialed, texted, or
  emailed — there's no telephony/SMS/SMTP provider connected.
- **Satellite encroachment checking** and the **AI risk score** / **AI land
  rate prediction** / **AI document extraction** are deterministic,
  explainable formulas over this app's own real data — not trained models
  and not a live imagery feed. They're built to be stable, reasoned, and
  demoable, and every one of them shows its own reasoning in the UI rather
  than just asserting a number.
- **Auto-drafted notices** are template/mail-merge text, not an LLM call —
  though the mandatory review-and-approve step before anything is finalized
  is real and enforced.
- **"Officer" workload** is really *district* workload, because the system
  doesn't model individual named officers beyond one demo login per role.

Everything else described above — every schema table, every permission
check, every state transition, every blocked action, every generated PDF —
is real, working application logic you can trace through the codebase.
