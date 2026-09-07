# Acceptance rows — Lane E analytics & judge-input contingency

Rows to append to `docs/ACCEPTANCE.md`. Per `DELEGATION.md` a PR is not
mergeable until a row exists here naming the feature, the owner, how it was
verified, and how it was validated.

**Nobody validates their own lane.** These rows carry Lane E's verification and
leave the validation column for Lane A, who validates E in the Friday round
robin. Two of them need Lane D specifically and say so.

Date: 2026-09-07 · Owner: **Lane E**

| # | Feature | Verified (built right) | Validation still needed (right thing) | Validator |
|---|---|---|---|---|
| E-1 | `lib/ai/input-guard.ts` — shared coercion for every judge-facing input | 29 unit tests. Indian currency (`45 lakh`, `₹45,00,000`), all six extent units plus the `0-84-00` triple, day-first dates, future-date pullback, 40k-char paste, `NaN`/`Infinity`/`[]`/`{}`. Every repair returns a visible note | Confirm the notes read as plain words to someone who is not a developer | A |
| E-2 | `lib/ai/explain.ts` + `FormulaTraceView` — the arithmetic on screen | Rendered by all four modules; copy-as-text path degrades silently where clipboard is blocked | Confirm a non-technical reader can follow one term from formula to result | A |
| E-3 | Risk sandbox — 8 presets, coercion, what-if, trace | 23 tests. All four bands reachable; cap holds at 100; all-zero scores 5 not 0; contradictory input repaired with notes; delegates to the real scorer rather than reimplementing it | Confirm the preset rationales explain *why* to press each one | A |
| E-4 | Land-rate sandbox — district table, classification factors, presets | 28 tests. District ordering (Chennai > Kanchipuram > Perambalur > Koraput); alternate spellings; 18% drift cap; logarithmic demand cap; unknown district names its fallback | **Confirm the indicative-band labelling is unmissable.** These are not gazette values and must never read as though they are | A |
| E-5 | `compareMultiplierPolicy` — the 2× vs 3× policy test | Asserted equal to Lane C's `calculateCompensation` for the same inputs, so the table cannot drift from a real award. Monotonic in the multiplier; cites s.26, s.29, s.30(1), s.30(3) | Confirm with Lane C that the First Schedule framing is stated correctly | C |
| E-6 | `lib/ai/document-triage.ts` — 12 upload outcomes | 27 tests. 0-byte, 25MB+, `.zip`/`.exe`/`.mp4`, encrypted, JPEG-named-`.pdf`, missing mime, 5000-char filename. Every outcome bilingual with a next action | Confirm the Tamil half of all 12 outcomes reads correctly | **D** |
| E-7 | `document-project-details.ts` — project details off a DPR / s.11 notification | Deterministic per document id; `missingFields` named rather than silently blank; confidence held inside the triage ceiling; 8 fixtures covering every branch | **Confirm with Lane C that this belongs in the new-project form flow** — Lane E built the reader, Lane C owns `new-project-form.tsx` | C |
| E-8 | `lib/ai/assistant/**` — ~100 bilingual answers, 10 categories | 94 tests. 60 real questions each asserted to a specific answer; adversarial fuzzing (22 inputs) none throwing; every entry has Tamil containing Tamil script; every follow-up id resolves; deterministic | **Tamil terminology review by a Tamil speaker.** Lane D owns the bilingual layer and the `lib/i18n.ts` vocabulary | **D** |
| E-9 | Statutory accuracy of the answer bank | 40+ entries cite a section. Two errors found and fixed in review: an SIA threshold that does not exist (SIA is mandatory for all acquisitions under s.4; the 100-acre trigger is the s.45 R&R Committee), and a non-existent 100-family threshold attributed to s.16 | **Independent legal read of every `basis` field against the bare Act.** This is the highest-risk content in the lane — a wrong section quoted confidently is worse than none | A + C |
| E-10 | `/app/ai-sandbox` page with `loading.tsx` and `error.tsx` | Typechecks clean; integrity problems surfaced on the page, not only in tests; skeleton shows structure rather than a spinner | Confirm nav placement with the integrator — this route is **not** in the ownership map and needs assigning | Integrator |
| E-11 | Lane D handoff (`handoff/lane-d/`) | Proposed `Chatbot.tsx` typechecks against the real repo without overwriting Lane D's file; the minimum change is a one-line delegation in `answerQuery` keeping its exact signature | **Lane D to accept, adapt or reject.** Not a Lane E merge | **D** |

## Not done, and not claimed

Stated here rather than discovered on demo day:

| Gap | Status |
|---|---|
| Playwright e2e / scripted demo run | **Not built.** The repo has no Playwright dependency and adding one is a `package.json` change, which is Rule-0 integrator-only. Needs the integrator to land the dependency before Lane E can write `e2e/**` |
| Encroachment sandbox | Not built. The module is covered by the answer bank (`poss-encroachment`) and the sandbox page, but has no what-if panel of its own |
| Offline/chaos pass with the DB seeded empty | Not run. All four modules are pure functions with no fetch, so they are offline-safe by construction — but that is an argument, not a test |
| Keyboard-only and WCAG AA audit | Not run on the new panels |
| Tamil rendering at 320px | Not checked |

## Weekly consistency audit — first pass

Lane E owns this per `DELEGATION.md`. Findings from building the above:

1. `voice-assistant.ts` `answerQuery` matches projects on any word over three characters, so *"status of my land"* can resolve to a project with "Land" in its name. **Fixed** in the new matcher; the old function still ships until Lane D lands E-11. — *Owner: D*
2. `document-categories.ts` gives `DPR`, `SIA_REPORT` and `NOTIFICATION` an empty `yields`, so no document could ever create a *project*. E-7 fills that gap but is not yet wired into the intake flow. — *Owner: C*
3. `risk-assessment-card.tsx` and `land-rate-prediction-card.tsx` are labelled "AI Risk Assessment" and "AI Land Rate Prediction" with the explanation only in a source comment. The sandbox states the position plainly; **the cards should too.** — *Owner: E*
4. `encroachment/page.tsx` passes `withinImpact: false` for every parcel, so one of the three inputs to the check is dead. — *Owner: E*
5. `RiskGauge` animates on mount with no `prefers-reduced-motion` guard. — *Owner: E*
