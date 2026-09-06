# TN-GLMS — Plan V2: Document Intake, Data Depth & Demo Substance

Scope: everything in `docs/26016.pdf` (SIH problem statement 26016) that is not yet
implemented, plus the intake / depth / asset problems found in review.

Read `docs/GAPS.md` first — it covers seed thinness and cross-linking. This plan does
not repeat those; it covers what GAPS.md does not: **document intake is fake, there is
no audit trail, SIA/R&R/Gram Sabha have no real data model, media is stored but never
displayed, and there are no demo assets.**

---

## Part 1 — Audit against 26016.pdf

### 1.1 Real-time parameters the platform must maintain (PDF p.1)

| # | Parameter | Status | Evidence / gap |
|---|---|---|---|
| 1 | Land proposed and acquired | Done | `parcels`, `projects.totalAreaHectares` |
| 2 | Notifications issued | Done | `notificationLog`, `noticeDrafts`, s.11/s.19 doc categories |
| 3 | Awards declared | Done | `AWARDED` stage, `AWARD_LETTER`, `lib/compensation.ts` |
| 4 | Compensation assessed and disbursed | Done | `compensations`, `compensationRates`, pay route |
| 5 | Possession status | Done | `POSSESSION` stage, `lib/parcel-status.ts` |
| 6 | R&R progress | Partial | Stage machine + `rehabilitationServices` exist, but no entitlement-to-delivery evidence, no per-family R&R timeline, no linkage to patta/survey identity |
| 7 | Number of affected **and displaced** families | **Gap** | `families` has no displacement flag. Only one match for "displaced" in the whole tree, in public marketing copy. The PDF names these as two distinct KPIs; we report one |
| 8 | Project-wise and **state-wise** progress | Partial | Project-wise done. No state-wise/national roll-up exists — zero matches for `byState`/`stateWise` |
| 9 | Timeline monitoring and milestone tracking | Done | `lib/sla.ts`, `stageHistory`, `rrStageHistory` |

### 1.2 Scope-of-study table (PDF p.1–2)

| Aspect | Status | Gap |
|---|---|---|
| Existing system study | Done | `docs/`, reference material |
| Stakeholders | Partial | 5 roles (`district`, `state`, `central`, `agency`, `field`). PDF names 8 — **no Rehabilitation Authority role, no Policy Maker / read-only analyst role** |
| Workflow digitization | Done | 11-stage machine, `lib/workflow.ts` |
| GIS & geo-tagging | Done | MapLibre, geometry editor, tile cache, elevation |
| **Data standardization** | **Gap** | No master data registry, **no published templates**, no uniform validation. This is exactly the "share templates so officers know what to upload" gap |
| Dashboard & analytics | Partial | Project + district. No state/national tier |
| Integration | **Gap** | `/app/interoperability` documents contracts as prose only. No live or mock-server integration, no adapter layer |
| Document management | **Gap** | `documents.version` exists but **no version history UI, no supersede flow, no in-app preview, no edit, no audit** |
| Monitoring & alerts | Partial | SLA computed and displayed; not pushed as alerts to the responsible officer |
| Reporting | Partial | CSV export + report builder. No trend analysis, no comparative analytics, no decision-support/predictive reports |
| **Security & governance** | **Gap** | **No `auditLog` table at all.** RBAC and scope are done, but "who changed what, when, from what to what" is unrecorded |
| Scalability | Partial | Bilingual TA/EN; SQLite; no multi-state master data |

### 1.3 "The system should provide" (PDF p.2–3)

| # | Requirement | Status |
|---|---|---|
| 7 | End-to-end digital workflow | Done |
| 8 | Online submission, verification, approval, tracking | Done |
| 9 | GIS geo-tagging and spatial visualisation | Done |
| 10 | Interactive **national** dashboard | Partial — project/district only |
| 11 | API integration with land records, cadastral maps, portals | **Gap** — documented, not built |
| 12 | Mobile-responsive field data collection | Done — `/app/field/[projectId]`, offline queue |
| 13 | Secure document repository **with version control and audit history** | **Gap** |
| 14 | Customizable MIS reports and executive dashboards | Partial |

---

## Part 2 — Verified findings on the review points

Each was checked against the code, not assumed.

### 2.1 Document extraction is not real

`src/lib/ai/document-intelligence.ts:1-25` states it outright: every extracted value is
derived from `hashSeed(documentId)`. **The file contents are never read.** Upload a blank
file and it still "extracts" an owner, a survey number and a plot boundary. The UI
presents this as an "AI document reader" with confidence scores.

This is the single most important thing to fix, and the most demo-fragile: any judge who
uploads their own file and sees a plausible Tamil name come back from an empty document
has found the seam.

### 2.2 `.txt` is the document format

`src/db/seed.ts:353,580,849-855` seed documents as `text/plain`, and every sample in
`manual-lifecycle-kit/documents/` is a `.txt` file. No revenue office issues a `.txt`.

### 2.3 No accepted-format contract, no drag and drop

`src/components/document-upload.tsx:81-89` is a bare `<input type="file" required>` —
**no `accept` attribute anywhere in the tree**, no drop zone, no multi-file, no progress,
no client-side validation, no rejection reason.

### 2.4 Per-plot patta/FMB upload does not scale

Correct, and the code confirms the shape: `document-categories.ts` declares
`FMB_SKETCH -> yields PARCEL` and `PATTA_CHITTA -> yields FAMILY`, one document to one
record, ingested one row at a time through `DocumentIngestPanel`. For a 400-parcel
alignment that is 800 uploads and 800 manual confirmations. Nobody would use it.

### 2.5 Documents tab is a flat scroll

`src/app/app/projects/[id]/page.tsx:609-719`: one table, no grouping, no search, no
filter, no sort, no pagination — and an **always-expanded `DocumentIngestPanel` rendered
as a second table row under every single document**, so 60 documents render 120 rows of
mixed content. No preview, no version history, no delete, no re-categorise, no edit.

### 2.6 Media is stored but never shown

`parcels.sitePhotoUrl` and `infrastructureItems.completionPhotoUrl` are written by
`src/db/seed-photos.ts` and **rendered nowhere**. The only photos on screen are
`projects.coverPhotoUrl` on two public pages. Grievance attachments have a download route
and no viewer. There is no gallery, no lightbox, no per-entity media tab, and no media at
all on gram sabha, entitlement grants, R&R services or legal disputes.

### 2.7 SIA, Gram Sabha and R&R are thin

- **SIA** is a stage name only. No SIA study record, no SIA unit, no expert group, no
  public hearing, no appraisal, no impact findings, no consent percentage. `SIA_REPORT`
  is a file category and nothing more.
- **Gram Sabha** (`schema.ts:339`) is five scalar fields: village, date, attendance count,
  minutes text, resolution text. No attendee roll, no objections raised, no responses, no
  photos, no signed minutes, no link to the families or parcels discussed.
- **R&R** (`rehabilitationServices`, `entitlements`) records `granted: true` with no
  evidence, no beneficiary identity beyond a name, and — the specific complaint — **no
  patta number, survey number, parcel link or role/basis shown on screen**, even though
  the identity fields and `entitlementBasis` already exist in the schema.

### 2.8 Drill-downs re-show what was already visible

Confirmed across panels: clicking a row opens a dialog populated from the same row data
already rendered in the table. No additional fetch, no related records, no history.

### 2.9 No audit log

`src/db/schema.ts` defines 25 tables; **none is an audit log**. `stageHistory` and
`rrStageHistory` cover stage transitions only. Every other mutation — rate changes,
payments, entitlement grants, document uploads, dispute edits — is unrecorded. PDF
Security & Governance requires audit trails; requirement 13 requires audit history.
Officers also cannot edit records at all today, so "everything should be logged" needs
both halves built.

### 2.10 3D models are primitive

`src/components/three-model-layer.ts` is 749 lines of `BoxGeometry`/`CylinderGeometry`.
The bridge is boxes for deck, pylon and piers with 6-segment cylinder cables. No
`/public/models` directory exists; no glTF is loaded anywhere.

---

## Part 3 — Decisions taken

| Decision | Choice |
|---|---|
| Bulk intake | **Village-batch + auto-match.** One village revenue extract produces N parcels + N families in a single reviewed batch. Per-plot ingest survives only as a single-plot exception path. Multi-file drop auto-matches by survey number |
| Extraction formats | **CSV / XLSX / text-layer PDF / DOCX.** Strict field grammar, in-platform downloadable templates, per-row validation, precise error report. **No OCR** — an image without a text layer is rejected with a reason and a template link. `.txt` demoted to dev fixture |
| 3D | **One hero `.glb`** for the flagship demo asset; richer procedural for the other asset kinds |
| Demo project | **New standalone flagship project** with a complete, internally consistent paper trail from DPR to possession certificate |

---

## Part 4 — Workstreams

Ordered by dependency. W1 and W2 unblock most of the rest.

### W1 — Audit trail + record editing (foundation) — **DONE (2026-09-06)**

Nothing else should be built on an unlogged database.

1. `auditLog` table: `id, actorId, actorRole, action, entityType, entityId, projectId,
   before (json), after (json), reason, ip, createdAt, prevHash, hash`. Hash-chained so
   tampering is detectable — this is the "compliance with government standards" story.
2. A single `withAudit()` wrapper in `src/db/audit.ts`; route every mutating API handler
   through it. Enforce with a test that fails if a mutating route bypasses it.
3. **Edit capability** for officers, gated by RBAC, on: parcels, families, compensation
   assessments, documents (metadata + supersede), disputes, tenders, gram sabha,
   entitlements. Every edit requires a reason string.
4. Audit history UI: a "History" affordance on every record showing field-level
   before/after with actor and timestamp; a project-wide audit view; a global
   `/app/audit` filterable log.

**Covers:** PDF Security & Governance, requirement 13, review point 2.9.

### W2 — Real rule-based extraction + bulk intake — **DONE (2026-09-06)**

1. **Document grammar** — `src/lib/extraction/schemas/`, one strict schema per category
   (patta/chitta, FMB, DGPS survey, EC, guideline value, asset valuation, legal heir).
   Each declares required fields, types, units, patterns (survey number format, extent
   units, Aadhaar masking rule) and cross-field rules.
2. **Parsers** — `csv`, `xlsx` (SheetJS), `pdf` (text layer via pdfjs `getTextContent`,
   with a labelled-field strategy and a table-region strategy), `docx` (mammoth to text).
   A shared `parse(file) -> { rows, warnings }` front-end so the grammar layer is
   format-agnostic.
3. **Validation + error report** — per-row, per-field, with human-readable messages naming
   the row, the field, what was found, what was expected, and the fix. Downloadable as
   CSV. Rejections explain *why*, including "image with no text layer".
4. **Templates in-platform** — a `/app/templates` page, plus a per-category download
   button at the point of upload, serving the canonical CSV/XLSX template and a filled
   example for every category. Generated from the same schema objects the parser uses, so
   the template can never drift from the validator. **This is the "data standardization"
   scope item.**
5. **Bulk intake UI** — drag-and-drop zone with `accept`, multi-file, size limit, progress,
   parsed-preview table (new / matched / conflicting / error), select-all, commit-N, and
   an audited batch record. Auto-match a dropped per-plot file to its parcel by survey
   number.
6. **Remove** `document-intelligence.ts`'s hash-derived generation, or quarantine it behind
   an explicit `DEMO_SYNTHETIC_EXTRACTION` flag that is off by default and visibly labelled
   in the UI when on. Confidence scores must reflect parse certainty, not jitter.

**Covers:** Data standardization, review points 2.1–2.4.

### W3 — Document repository

1. Categories as first-class navigation: group by `DOCUMENT_CATEGORY_META.group`, then
   category; collapsed sections with counts.
2. Search (filename, category, uploader, extracted field values), filters (category, stage,
   uploader, date range, ingested/not, has-issues), sort, pagination.
3. Collapse the inline ingest panel — one row per document, ingest opens in a sheet.
4. In-app **preview**: PDF viewer, image viewer, table viewer for CSV/XLSX, text viewer.
5. **Version control**: supersede-with-reason, version timeline, diff of extracted fields
   between versions, restore. Backed by W1's audit chain.
6. A project-level **Media** tab and per-entity media strips (see W4).

**Covers:** Document management, requirement 13, review points 2.5, 2.6.

### W4 — Media everywhere

1. `mediaAssets` table: `id, entityType, entityId, projectId, kind (PHOTO|VIDEO|DOC|AUDIO),
   storagePath, mimeType, caption, latitude, longitude, capturedAt, uploadedBy, uploadedAt`.
   Polymorphic, so every entity gets attachments without twelve new columns.
2. Attach and view on: parcels, families, entitlement grants, R&R services, gram sabha
   consultations, infrastructure items, grievances, legal disputes, notifications, projects.
3. A reusable `<MediaStrip>` plus lightbox with EXIF/geo display and map pin, and a
   project-level gallery filterable by entity type and date.
4. Wire the already-stored `sitePhotoUrl` / `completionPhotoUrl` into it so existing data
   becomes visible immediately.

**Covers:** review point 2.6, and the entitlement-grant-evidence gap in `docs/GAPS.md`.

### W5 — SIA, Gram Sabha and R&R depth

1. **SIA**: `siaStudies` (agency, commencement, statutory six-month deadline, methodology,
   status), `siaFindings` (affected families count, displaced families count, land use,
   livelihood impact, common property resources, alternatives considered, social costs),
   `siaPublicHearings` (village, date, attendance, objections raised, responses, media),
   `siaAppraisals` (expert group members, recommendation, reasons). Full panel with
   statutory deadline tracking against RFCTLARR s.4–7.
2. **Gram Sabha**: attendee roll (name, role, patta/survey where relevant, signature or
   thumbprint media), objections table with per-objection response and status,
   quorum/consent computation, linked parcels and families, minutes document and photos.
3. **R&R**: per-family R&R case view showing **patta number, survey number, parcel link,
   entitlement basis under s.3(c), displacement status, and role (titleholder / tenant /
   labourer / artisan)**, the full entitlement matrix under Schedule II with statutory
   basis per line, delivery evidence (media + signature + notification link), and a
   chronological case timeline.
4. **Displaced vs affected**: add `displacementStatus` to `families`; surface both counts
   everywhere the PDF asks for them.

**Covers:** parameters 6 and 7, review point 2.7.

### W6 — Drill-downs that add information

Rule: a drill-down must fetch and show something the list row could not. Each detail view
gets the full record, related records up and down the chain, status history, audit history,
attached media, notifications sent, and the next action required with responsible actor.

Apply to: parcel, family, compensation, grievance, entitlement, dispute, tender,
contractor, land-bank entry, gram sabha, R&R service, document, project request.

**Covers:** review point 2.8, `docs/GAPS.md` section 2.

### W7 — Demo assets

1. **Flagship project** — a new fictional project (bridge plus approach road) with a
   complete internally consistent record set: DPR, design drawings, site investigation,
   RoW plan, SIA report and hearing minutes, s.11 notification, s.19 declaration, award,
   possession certificate, plus a village chitta extract, FMB sheets, EC, guideline value
   certificate, asset valuation, legal heir certificate. Authored as **real PDF/DOCX/XLSX**
   that the W2 parser actually parses — the documents and the validator ship together.
2. **Drawings** — plan, elevation and section SVG for the bridge, alignment plan, RoW cross
   section, cadastral overlay.
3. **Photos** — locally generated site, progress and handover imagery committed to the
   repo, so the demo needs no network.
4. **Hero `.glb`** — **DONE.** A detailed bridge model (deck segments, girders, cable stays, pier
   caps, bearings, railings, expansion joints, approach embankment, abutments) generated by
   a build script and exported to `/public/models`. Loaded with `GLTFLoader`, with the
   existing procedural builder as offline fallback. Raise procedural detail for the other
   asset kinds.
5. **Runbook** — a start-to-finish script that walks the flagship from DRAFT to RR_COMPLETE
   using only the shipped assets, updating `demo-kit/`.

**Covers:** the demo-substance complaint end to end.

### W8 — Remaining PDF scope

1. **State-wise and national dashboard** tier above district, with the nine PDF parameters
   rolled up per state and nationally.
2. **Two missing roles**: Rehabilitation Authority, and Policy Maker (read-only cross-state
   analyst). Extend the RBAC matrix and its tests.
3. **Integration adapter layer**: turn `/app/interoperability` prose into real adapters with
   a local mock server, so e-Gazette / land-records / PFMS calls execute against a stub and
   log the exchange. Reversible to real endpoints by config.
4. **Alerts**: push SLA breaches, pending approvals and statutory deadlines to the
   responsible officer's dashboard and notification channels, rather than only computing them.
5. **Reporting**: trend, comparative and decision-support reports on top of the existing
   builder.

---

## Part 5 — Sequence

| Phase | Contents | Rationale |
|---|---|---|
| 1 | ~~W1 (audit + edit)~~ **done** | Everything after this is logged; retrofitting is worse |
| 2 | ~~W2 (extraction + bulk + templates)~~ **done** | The credibility fix; unblocks W7 documents |
| 3 | W7.1–7.3 — documents and drawings **done**, photos outstanding | Authored against the real parser |
| 4 | W3 + W4 (repository + media) | Makes W7 assets visible and navigable |
| 5 | W5 (SIA / Gram Sabha / R&R) | Depth where it is thinnest |
| 6 | W6 (drill-downs) | Cross-links the now-real data |
| 7 | ~~W7.4 (hero .glb)~~ **done early** + W8 | Polish and remaining PDF scope |

## Part 6 — Acceptance

- Uploading a blank or wrong-format file produces a **rejection with a reason**, never a
  fabricated record.
- One village chitta extract creates 100+ parcels and 100+ families in a single reviewed,
  fully audited batch.
- Every category has a downloadable template generated from the same schema the validator
  enforces.
- Every mutating API route writes an audit entry; a test fails if one does not.
- Every officer-editable record shows field-level before/after history.
- Every document is previewable in-app and has a version timeline.
- Every entity listed in W4.2 can carry and display photos.
- An R&R case shows patta number, survey number, parcel, entitlement basis and role.
- Both affected and displaced family counts are reported.
- The flagship project runs DRAFT to RR_COMPLETE offline using only committed assets.
