# TN-GLMS Gaps — Page Depth, Data Linkage & User Flow Fixes

A checklist of what is partially built or missing, organized by impact on the demo.

---

## Section 1: Database Seeds Are Thin (Critical Path)

### Why it matters
Judges click into empty corners and see "no data" — they assume the feature doesn't work. The seed is the difference between "we built it" and "it is real".

| Table | Current | Target | Note |
|---|---|---|---|
| `projects` | 4 demo projects | 12–15 across 6+ districts | Every major RFCTLARR stage should be visible |
| `parcels` | ~50 | 300+ | Especially: parcels in different statuses within the same project |
| `families` | ~20 | 150+ | With varied entitlement states (eligible, granted, pending, disputed) |
| `compensations` | ~30 rows | 150+ | Spread across stages: unassessed, assessed, awarded, paid, disputed |
| `grievances` | ~10 | 50+ | Every status: filed, assigned, under-review, resolved, dismissed |
| `documents` | ~15 | 100+ | Section 11, Section 19, notices, awards, possession certificates across projects |
| `tenders` | 1 per project | 3–5 per project | Construction, rehab, community centers; some awarded, some in progress |
| `contractors` | 2 | 10+ | Each with a history across multiple projects and tenders |
| `gram_sabha_consultations` | 0 | 3–5 per project | Dates, attendance, resolutions, signed-off |
| `infrastructure_items` | 1 checklist | Full per project | Roads, water, power, schools; each marked complete or pending |
| `legal_disputes` | 2 | 15+ | Different courts, outcomes (pending, disposed, stayed, upheld) |
| `land_bank_entries` | 0 | 20+ | Idle parcels, review status, repurposing history |
| `rehabilitation_services` | 0 | 100+ | Skill training, housing allotment, job placement; each with dates and status |
| `notificationLog` | ~30 | 200+ | Voice, email, SMS (simulated), postal (real tracking) |
| `audit trails` | ??? | Every mutation | **Missing table.** Add `auditLog(id, actor, action, entity, before, after, timestamp, hash)` |

**Ownership:** Lane B

---

## Section 2: Page Depth — Missing Drill-Downs & Links (Critical Path)

The problem: pages show data but don't let you dig into it. A family row is a number; you want to click it and see their entitlements, their grievances, their heir record, whether they were notified.

### Public pages (Lane D)

| Page | Current | Missing |
|---|---|---|
| **Project detail** (`/projects/[id]`) | Map, stage, docs | Click a parcel → see its compensation breakdown, its entitlements, its grievance history |
| **Compensation info** (`/compensation`) | General rules | A calculator that takes survey no. + area + rate and shows the breakdown |
| **R&R info** (`/rr`) | General entitlements | A family query: "enter your name or patta number" → see what you qualify for |
| **Track page** | Grievance + project request lookup | Missing: notification log (a citizen seeing "postal notice sent on date X, status Y") |

### Officer console (Lane C)

| Page | Current | Missing |
|---|---|---|
| **Dashboard** (`/app`) | Project cards, stats | **Dead buttons.** "Review Grievances", "Project Requests" open those pages — but the cards should link directly to the 3 oldest unresolved items per category, sorted by SLA breach date |
| **Compensation tab** | Redo: search + filters + drill-down added recently | ✓ Done. Verify: every drill-down shows legal basis (RFCTLARR Sec 26–30), who approved it, who can reverse it |
| **R&R & Families tab** | Family list + entitlements | **No drill-down.** Click a family → see their parcel → their compensation award → their grievances → their heir record → their entitlements + grant status. Links at every step. |
| **Infrastructure tab** | Checklist, land bank list | **No cross-linking.** Click a land-bank parcel → see why it was flagged, review history, repurposing status. |
| **Legal tab** | Disputes list | **No drill-down.** Click a dispute → case history, linked parcel + families, whether it has a stay order, linked compensation/possession blocks. |
| **Tenders tab** | Tender list, award flow | **No history view.** Click a tender → all bids, all changes, which contractor won. Click a contractor link → see all projects this contractor worked on. |
| **Docs tab** | Checklist, upload, table | **Extraction missing.** Section 11 and Section 19 docs should auto-extract date, notification district, geographic extent. Award docs should extract recipient, amount, signature. |
| **Grievances queue** (`/app/grievances`) | Table list | **No drill-down or prioritization.** Sort by SLA breach date; click a row → full grievance record, linked parcel/family/project, status history, all attachments, next action required. |
| **Project Requests queue** (`/app/project-requests`) | Table list | **Same as grievances.** Click → full request record, linked citizens, status history, feedback log. |
| **Conflicts detector** (`/app/conflicts`) | Flagged families | **No acknowledgement.** Click "dismiss" but nowhere to record *why* it is a false positive or what you did about it. |
| **Workload view** (`/app/workload`) | District summary stats | **No drill-down.** Click a district → all projects, all SLA-breached cases, all open grievances. |
| **Reports** (`/app/reports`) | CSV export | **No interactivity.** Reports should be queryable dashboards (filter by stage, date range, district) before export. |

**Key pattern:** When a judge sees a number on screen, every ID should be clickable. Follow the chain: parcel → compensation → grievances → entitlements → heirs → audit history. Nothing is an island.

**Ownership:** Lane C (with Lane D for public)

---

## Section 3: User Flow Inconsistencies (Critical Path)

These are places where the user's intent doesn't match the system's design.

### Landing page → Citizen

**Current flow:** `/` → search project by name → `/projects/[id]` → file grievance or request project.

**User need:** "I own land in this project. Show me what I'm owed."

**Gap:** The `/` landing page does not have a "find my land" entry point. The citizen has to know the project name. They should be able to enter a survey number, patta number, or village name and find their parcel directly, seeing its compensation award and R&R entitlements without first navigating to a project.

**Fix:** Add `/my-land` (requires login OR surveyNumber + pattaNumber as query params for public use) that queries the parcel table and shows:
- The parcel, its boundaries on a map, its photos
- Its compensation (broken down by RFCTLARR section)
- Its R&R entitlements (housing, job training, etc.) and which are granted
- Link to file a grievance if they disagree
- Link to track grievances they have already filed

**Ownership:** Lane D (public) + Lane C (console version at `/app/my-parcels` for officers)

### Officer → Parcel status

**Current flow:** Project workspace → "Overview" tab, scroll the parcel table, click a parcel.

**User need:** "I need to mark 200 parcels verified today. Let me see them, mark them, and move on."

**Gap:** The field verification tool (`/app/field/[projectId]`) is good, but there is no shortcut from an officer's dashboard to "the 200 parcels I need to verify". They land on `/app`, see nothing actionable, and have to know to go to `/app/field`.

**Fix:** Add a "My Pending Actions" panel on the dashboard:
- Parcels awaiting my verification (field role)
- Compensations awaiting my rate-setting (district role)
- R&R cases awaiting my approval (state role)
- Projects awaiting my notifications (district role)

Each is a count that links directly to the page + filtered to show only *my* pending items.

**Ownership:** Lane C

### Officer → Grievance escalation

**Current flow:** Grievance queue → status is "open" → ... then what? Who should act next?

**User need:** "I am a district officer. Show me the grievances I need to resolve, and when I cannot, tell me who I need to escalate to."

**Gap:** There is no "next actor" indicator. A grievance row shows its status but not "the state has this one" or "this is pending a court order".

**Fix:** In the grievance detail, add a section:
```
Next step required:
✓ Assigned to: District Collector (you are logged in as: [your district])
Cannot proceed until: [Legal hold / State approval / Citizen response / ...]
SLA breach date: [red if past, green if on track]
```

**Ownership:** Lane C

### Officer → Stay order enforcement

**Current flow:** A judge marks a project as having a stay order in the Legal tab. A district officer tries to pay compensation and... the action silently fails? Returns an error?

**User need:** "The law prevents me from doing X. Show me why before I try."

**Gap:** The stay-order block exists (code-level), but the UI doesn't pre-emptively show it. An officer might click "Mark Paid" and get an error without understanding it is a legal block.

**Fix:** In the Compensation tab, when a stay order exists, show a banner:
```
⚠️ Court stay order active
Compensation payment is blocked on this project (case #[number] in [court], ordered [date]).
Unblock: Mark the stay order as lifted in the Legal tab.
```

Make the button disabled + show the banner *before* they try to click it.

**Ownership:** Lane C

### Entitlement → Grant handshake

**Current flow:** R&R tab shows families and entitlements; an officer has a "grant" button per entitlement.

**User need:** "I am granting housing. Show me proof the citizen received it; record it."

**Gap:** There is no *evidence* of the grant — no signature capture, no photo, no upload. The database just records `granted: true` with no accountability.

**Fix:** When granting an entitlement, require:
- A photo (offline-capable) of the delivery
- A digital signature or thumbprint (if available)
- A note ("housing allotted in sector 3, plot 45")
- Link to the notification that was sent (SMS / postal / voice)

Store the grant as an audit event, not just a boolean.

**Ownership:** Lane C (with Lane A for offline photo capture)

### Parcel → Possession marking

**Current flow:** Field verification tool marks a parcel as "possessed". That is it.

**User need:** "I am taking formal possession. The law says I must notify the owner and give them a chance to object."

**Gap:** There is no *notification* flow tied to possession marking. The system does not automatically trigger a notification, and there is no way to track whether notification happened before possession was marked.

**Fix:** When an officer marks a parcel as "possessed", the workflow should:
1. Check if notification has been logged (see the `notificationLog` table)
2. If not, show a warning and offer a button to "Log postal notification"
3. Store the possession marking with a linked notification id
4. Optionally, send a real SMS/postal (simulated for now) to the family

**Ownership:** Lane C

---

## Section 4: Data Consistency Gaps (Medium Priority)

### Missing fields in existing tables

| Table | Missing field | Why | Example |
|---|---|---|---|
| `projects` | `assetKind` (enum) | Lane A needs it for glTF model selection | Bridge, canal, residential, transmission-line |
| `parcels` | `structureType` (enum) | Lane A needs it for house-volume modeling | House, agricultural, commercial, empty-land |
| `parcels` | `geotagPhotos[]` | Field verification photos are stored where? Currently not in schema | Photo taken during verification |
| `compensations` | `paidVia` (enum) | How was it paid? Bank transfer, check, cash? | Bank transfer, and link to a `bankTransfer` table |
| `families` | `mobileNumber`, `emailAddress` | Required to send real notifications (SMS, email) | Only parsed from uploads; not stored |
| `entitlements` | `grantedPhotoId` (FK) | Proof of grant (photo); currently missing | FK to a `photos` or `documents` table |
| `notificationLog` | `linkedDocumentId` (FK) | Which notice PDF was sent? Currently orphaned | FK to `documents` table |
| `grievances` | `linkedParcelId` (FK) | Compensation grievances are about a parcel; none currently linked | Currently only linked to a project |
| `stageHistory` | `notificationId` (FK) | When state marked "notified", was the notice actually sent? Track it. | FK to `notificationLog` table |
| `auditLog` | (entire table missing) | Who did what when; cryptographic chain. | See Section 1 |

**Ownership:** Lane B (schema), Lanes C/A (usage in code)

### Data integrity constraints

| Check | Current | Required |
|---|---|---|
| Compensation can only be paid if rate is set | ✓ | Code check; also add a NOT NULL on `compensationRates.id` FK |
| Parcel can only be marked possessed if it is compensated | ✓ | Code check; also make it strict at the DB level |
| Grievance can only be filed on a parcel / family in the project | ✗ | Code check missing |
| Family added to project must have a parcel in that project | ✗ | Code check missing |
| R&R cannot start if compensation stage is not marked complete | ✓ | Code check; verify it is enforced on the panel |
| Stay order blocks compensation payment AND parcel possession | ✓ | Code enforcement; verify both paths |

**Ownership:** Lane B (schema) + Lane C (enforcement in panels)

---

## Section 5: Language & Accessibility Gaps

| Component | Current | Gap |
|---|---|---|
| **Public site language switch** | Static "தமிழ் \| English" text | Real language context + cookie; rerender on switch |
| **Console pages** (reports, workload, conflicts, contractors, land bank, encroachment) | English only | Wrap all labels in `<Bilingual>` tags |
| **Error messages** | English | Tamil-ified error strings in `lib/i18n.ts` |
| **Workflow messages** | E.g., "Cannot mark paid while stay order active" | Both languages |
| **RFCTLARR section references** | "Sec 26" (English) | "பிரிவு 26" (Tamil) displayed inline |
| **PDF generation** | English | Option to generate in Tamil |
| **Voice assistant** (VANI) | Tamil speech synthesis exists; Tamil recognition does not | Verify `ta-IN` recognition works end-to-end |
| **Keyboard navigation** | Untested | Test all pages with Tab + arrow keys, no mouse |
| **Color contrast** | Untested | WCAG AA on all interactive elements |

**Ownership:** Lane D (language), Lane E (accessibility + testing)

---

## Section 6: Demo-Proofing Contingencies (Critical Path)

These are the things that will break on demo day if the network is bad, the database is corrupted, or a real service is down.

| Feature | Dependency | Fallback needed |
|---|---|---|
| **3D view** | Terrain DEM download on first load | Offline cached tiles (Lane A) |
| **Risk score** | Nothing (deterministic formula) | ✓ Already safe |
| **Land-rate predictor** | Nothing (deterministic formula) | ✓ Already safe |
| **Document extraction** | PDF parsing (client-side) | ✓ Already safe (template-based fallback) |
| **VANI assistant** | `/api/public/projects` (must load) | Cached project list in localStorage if fetch fails |
| **Satellite imagery** | Esri / OpenFreeMap tiles | Offline cached tiles (Lane A) |
| **Notifications** | SMS / email / voice services | ✓ Already simulated; postal tracking only real |
| **Search** | `/api/search` route working | Fallback to simple in-memory filter if API fails |
| **Grievance tracking** | Database available | Empty-state UI if DB is down (do not show error) |

**Rule:** If a feature is read-only or non-critical to the demo, it should show a graceful "data unavailable" state with an explanation, not an error. If it is critical (map rendering, entry into a workflow), it must have an offline/cached fallback.

**Ownership:** Lane E (contingencies) + Lane A (tile cache)

---

## Section 7: Test Coverage Gaps

The 33 test files are green, but coverage is not uniform.

| Module | Current coverage | Missing tests |
|---|---|---|
| `lib/compensation.ts` (award maths) | ✓ Good | Edge cases: zero area, very high rates, negative values |
| `lib/workflow.ts` (stage guards) | ✓ Good | Role × stage matrix (all 6 roles × 9 stages = 54 cells) |
| `lib/rbac.ts` | ✓ Good | Role × permission matrix (all 6 roles × 20+ perms) |
| `lib/project-scope.ts` | ✓ Good | District officer cannot see state project; state cannot see district |
| All API routes | ✗ Missing | Each route should have a contract test: auth required? scope checked? zod validation works? |
| Component drill-downs | ✗ Missing | E2e test: click parcel row → dialog opens → shows linked data → close works |
| Offline queue | ✓ Decent | Test: queue 10 actions offline, sync when online, verify order |

**Ownership:** Lane E

---

## Section 8: Accessibility & Mobile

| Check | Status | Note |
|---|---|---|
| Tab navigation works end-to-end | ✗ | Test with keyboard only, no mouse |
| Screen reader announces table headers | ✗ | Use `aria-labelledby` on table cells |
| Map is keyboard-navigable | ✗ | Can I zoom/pan with arrow keys? |
| Touch targets are 44px+ | ✗ Partial | Buttons are OK; small icon buttons in tables might not be |
| Mobile layout tested | ✗ | Responsive breakpoints at 320px, 640px, 1024px |
| Tamil text renders correctly on mobile | ✗ | Noto Sans Tamil must be font-loaded; test on 2G speed |

**Ownership:** Lane D (mobile UX) + Lane E (accessibility + testing)

---

## Rollout Checklist

This checklist goes into `docs/ACCEPTANCE.md` and is the gate to the demo.

### Database
- [ ] Seed has 12+ projects, 300+ parcels, 150+ families, 150+ compensations, 50+ grievances
- [ ] Audit log table created and wired to every mutating API route
- [ ] All foreign keys are enforced; `db:check` script passes
- [ ] Role × scope matrix verified (6 roles × 30+ queries = 180 checks)

### Pages
- [ ] Every page with data has a drill-down on every ID (20 pages × avg 5 IDs per page = 100 cross-links)
- [ ] Every next-action is obvious; no dead buttons (all dashboard links live, all action buttons reachable)
- [ ] Empty, loading and error states exist on every table (15 tables × 3 states = 45 screenshots)

### Flows
- [ ] Citizen journey: register → find land → see award → see entitlements → file grievance → track (Lane D e2e)
- [ ] Officer journey: parcel verification → mark compensated → award → notify → R&R → possession (Lane C e2e)
- [ ] State oversight: see SLA breaches → drill down to causes → see audit chain (Lane C e2e)
- [ ] Role isolation: district officer cannot see another district's project (Lane B matrix)

### Language & Access
- [ ] Language switch works; entire journey is Tamil-usable (Lane D e2e)
- [ ] Tab navigation works end-to-end without a mouse (Lane E keyboard test)
- [ ] WCAG AA contrast on all interactive elements (Lane E audit)

### Contingencies
- [ ] Offline tile cache exists and is used when network is unavailable (Lane A test)
- [ ] 3D view does not break if DEM fails to load (Lane A error state)
- [ ] VANI works offline with cached projects (Lane D test)
- [ ] All read-only features degrade gracefully if DB is slow (Lane E chaos test)

### Demo rehearsal
- [ ] Scripted e2e demo runs end-to-end, offline, in < 10 min (Lane E + integrator)
- [ ] All 6 roles can log in and reach their pages (Lane E role matrix)
- [ ] Printed "try it yourself" card has 10 seeded inputs (survey no., tracking no., project names)
