# Manual End-to-End Lifecycle Walkthrough

This is the exact click path for a fresh local database. It deliberately changes one project at a time and shows the role-specific control at every stage.

## 0. Prepare a clean demo

From the repository root, run:

```powershell
npm run db:push
npm run db:seed
npm run dev
```

> **Warning:** `npm run db:seed` deliberately clears the project's existing **local** database tables before inserting the demo dataset. Use it only with a disposable local demo database; never point it at shared or production data.

Open `http://localhost:3000/app`. Use the **Switch demo role** control in the header whenever the table says to switch roles.

## 1. Create and prepare the project — DRAFT

1. Switch to **District (Koraput)**.
2. Dashboard → **New Project** → enter all values from `project-inputs.md` → **Create project**.
3. On **Overview**, draw and save the alignment from `project-inputs.md`.
4. On **Documents**, upload these files using the matching category:

| File | Select this category | Demonstrates |
| --- | --- | --- |
| `01-dpr.txt` | Detailed Project Report | public purpose / scope |
| `02-sia-report.txt` | Social Impact Assessment report | social-impact evidence |
| `07-fmb-sketch.txt` | FMB sketch | document ingest → parcel |
| `08-patta-chitta.txt` | Patta / Chitta / Adangal extract | document ingest → affected family |

5. For `07-fmb-sketch.txt` and `08-patta-chitta.txt`, use the extraction/ingest control displayed under the uploaded document and confirm the created record. The current reader generates consistent demo records from the uploaded document id; it does not read the literal text.
6. Optional: draw the manual parcel from `project-inputs.md`, then in **Compensation** set the current rate to `1800000` and multiplier to `2`.

## 2. Main project state transitions

On the project **Overview**, use the action buttons shown beside the stage tracker. Confirm the browser prompt after each action.

| Current state | Role to use | Click action | Resulting state | Supporting asset to upload / show |
| --- | --- | --- | --- | --- |
| DRAFT | District (Koraput) | `SUBMIT` | SCRUTINY | DPR + alignment |
| SCRUTINY | District (Koraput) | `APPROVE` | SIA | SIA report |
| SIA | District (Koraput) | `COMPLETE` | NOTIFIED | `03-notification.txt` as Preliminary notification |
| NOTIFIED | State Govt (Odisha) | `STATE_APPROVE` | STATE_APPROVED | state approval shown through stage history |
| STATE_APPROVED | Central (DoLR) | `CENTRAL_APPROVE` | CENTRAL_APPROVED | central approval shown through stage history |
| CENTRAL_APPROVED | District (Koraput) | `PUBLISH_DECLARATION` | DECLARED | `04-declaration.txt` as Declaration and R&R summary |
| DECLARED | District (Koraput) | `PASS_AWARD` | AWARDED | `05-award.txt` as Award |
| AWARDED | District (Koraput) | `START_RR` | RR_IN_PROGRESS | families / compensation tab |

After each transition, pause to point at **Stage history**. That is the evidence that records actor role, action, prior stage, next stage and time.

## 3. R&R sub-workflow — required before possession

Stay on the project and open **R&R & Families**. This is a second workflow; it must reach `RR_AWARDED` before the main project can leave `RR_IN_PROGRESS`.

| Current R&R state | Role | Click **Complete this step** | Suggested note |
| --- | --- | --- | --- |
| No R&R stage | District (Koraput) | `COMPLETE_SURVEY` | Household survey completed for Semiliguda affected corridor. |
| SURVEYED | District (Koraput) | `COMPLETE_SCHEME` | R&R scheme drafted with housing, livelihood and transport measures. |
| SCHEME_DRAFTED | District (Koraput) | `COMPLETE_HEARING` | Public hearing completed; objections logged and addressed. |
| PUBLISHED | District (Koraput) | `SUBMIT_TO_COLLECTOR` | Scheme and objections report submitted to Collector. |
| SUBMITTED_TO_COLLECTOR | State Govt (Odisha) | `APPROVE_RR_SCHEME` | State R&R committee approval recorded. |
| COMMITTEE_APPROVED | District (Koraput) | `PASS_RR_AWARD` | Final R&R award passed and benefits scheduled. |

## 4. Possession and completion

1. Switch to **District (Koraput)** → Overview → click `COMPLETE_RR`. The project becomes **POSSESSION**.
2. Open **Infrastructure**. The Third Schedule checklist is created for the project at this point. Mark each item complete for the demo.
3. Upload `06-possession-certificate.txt` under **Possession certificate**.
4. Return to Overview → click `COMPLETE_INFRASTRUCTURE`. The project becomes **RR_COMPLETE**.

## 5. Optional evidence-rich moments

- **Compensation:** Assess and mark payment for the manual or ingested parcel after the project reaches AWARDED. This demonstrates rate, multiplier, assessment and payment records.
- **Legal:** Add a legal dispute before trying a payment, then show the payment guardrail when a stay is active. Clear it before proceeding.
- **Community:** Record a Gram Sabha consultation and show it under the Community tab.
- **Tenders:** Add a tender once the project is in possession to show delivery work is linked to the same project.
- **Notifications:** Send only simulated/test notifications. Do not use personal Gmail or WhatsApp credentials in a jury demo.

## 6. Reset between rehearsals

The demo seed deliberately clears local data, so use this only with a disposable local database:

```powershell
npm run db:push
npm run db:seed
```

Do not run this reset against a shared or production database.
