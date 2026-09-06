# Lifecycle Gaps Found in the Current Repository

The current repository supports manual creation and the full state sequence documented in `manual-lifecycle-walkthrough.md`. The following limitations matter when presenting it as an end-to-end statutory workflow.

| Gap | Evidence in current implementation | Demo impact |
| --- | --- | --- |
| Main transitions do not require evidence prerequisites | `applyProjectTransitionWith` checks the allowed role and only checks `RR_AWARDED` before `COMPLETE_RR`. | A presenter can advance DRAFT through AWARDED without a DPR, SIA, parcel, payment, or declaration uploaded. Show the assets manually, but do not claim those checks are enforced. |
| Infrastructure completion is not enforced before the final main transition | `COMPLETE_INFRASTRUCTURE` is a valid transition from POSSESSION; checklist items can be marked complete independently. | Mark the checklist items manually for a credible demo. The app does not currently block the final transition if any remain pending. |
| Document ingest is deterministic demo extraction, not OCR | `src/lib/ai/document-intelligence.ts` describes hash-based extraction from the document id. | The sample FMB and Patta files are valid demo upload artifacts, but their written values are not parsed into the created records. |
| No project completion / operations state exists after R&R | The main workflow ends at `RR_COMPLETE`; tender states are separate from the project state machine. | You can show tender and contractor progress, but cannot transition the project itself to construction-complete, commissioning, or operations. |
| No enforced link between compensation payment and possession | The main transition guard requires the R&R award but does not verify every parcel is paid. | Use compensation screens as evidence during the demo; do not describe payment completion as a hard gate. |
| The state machine is linear for the happy path | Rejection actions only exist in early review/approval stages; there is no reopen / appeal / correction loop after award. | Demonstrate the happy path and mention that post-award exception handling remains future work. |
| Actual delivery-channel credentials are external | Email and WhatsApp integrations need sender-side configuration/session state. | Use in-app logs or simulated outcomes during a live demo; never use real accounts or personal data. |

## What is not missing

- A UI-based **New Project** action exists on the internal dashboard for roles permitted to create projects.
- The main lifecycle state machine contains all eleven states from `DRAFT` to `RR_COMPLETE`.
- The R&R workflow contains all six states required before possession.
- The role switcher provides the district, state and central roles necessary to demonstrate the approval hand-offs.
- Document upload, GIS alignment/parcel entry, families, compensation, infrastructure, legal, tenders and notifications are present as project capabilities.

## Recommended next repository changes (not made by this kit)

1. Enforce a configurable evidence checklist before each main transition.
2. Require every Third Schedule item to be complete before `COMPLETE_INFRASTRUCTURE`.
3. Add project delivery states after `RR_COMPLETE`: construction, commissioning and operational handover.
4. Add explicit payment / possession gates and an exception-resolution workflow.
5. Replace the deterministic document reader with reviewed OCR/extraction when production integrations are in scope.
