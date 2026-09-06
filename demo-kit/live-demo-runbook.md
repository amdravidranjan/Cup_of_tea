# TN-GLMS — End-to-End Live Demo Runbook

Duration: 10–12 minutes  
Demo project: **Koraput River Bridge Project** (`p-demo-bridge-1`)  
Audience: jury / departmental stakeholders

## Before the audience arrives

1. Run the four setup commands in `README.md` in this folder.
2. Open `http://localhost:3000` in a normal browser window and `http://localhost:3000/app` in a second tab.
3. Confirm the map tiles load. If the network is unreliable, keep the dashboard, a project detail tab, and the lifecycle SVG open as fallbacks.
4. Do not reset the database mid-presentation. If a live action changes a record, explain that the audit trail is the expected result.

## Story to tell

"A community needs a safe all-weather bridge. The system makes every step — from a citizen request and social-impact work through lawful acquisition, compensation, resettlement, construction and public accountability — visible and auditable."

## Presenter path

| Time | Screen / action | What to say | Evidence to point at |
| --- | --- | --- | --- |
| 0:00 | Open `/` | "This is the public transparency portal — no login is required to understand a project or its statutory status." | Project search, notices, citizen services, chatbot.
| 0:45 | Open `/request-project` | "A citizen or local body can initiate a need with location and purpose; this becomes a trackable request, not an informal paper trail." | Submit form; mention seeded request queue.
| 1:20 | Open `/track` | "People can track grievances and project requests independently." | Tracking tabs and status design.
| 1:45 | Open `/app`, choose **District (Koraput)** in **Switch demo role** | "The staff view is role-aware. A district officer sees operational work; approvals remain with the appropriate authorities." | Dashboard workload, alerts and project list.
| 2:30 | Open **Koraput River Bridge Project** | "One record carries the whole lifecycle, rather than splitting maps, files, awards and resettlement across systems." | Stage tracker, SLA badges, stage history.
| 3:15 | Overview tab | "The GIS view makes the proposed alignment and affected parcels inspectable; the risk card explains why an item needs attention." | Parcel layer, map controls, risk assessment.
| 4:00 | Documents tab | "Every core record is categorized and versioned. The system can also generate standard documents from project data." | Upload / document list / generate-document action.
| 4:45 | Compensation tab | "Awards are traceable at parcel level. Controls help prevent payment while a legal stay is active." | Compensation table, status, legal guardrails.
| 5:35 | R&R & Families tab | "Acquisition is not complete at payment. Family entitlements, succession and rehabilitation assistance are handled as a separate, accountable workflow." | Affected families, entitlements, R&R stage.
| 6:25 | Infrastructure tab | "Resettlement infrastructure — housing, water, roads and services — is tracked to completion." | Checklist and completion evidence.
| 7:00 | Legal tab | "Court matters and stay orders are first-class data, so operational actions can respect legal constraints." | Case list and stay indicator.
| 7:35 | Tenders tab | "Once land is ready, tendering and contractor progress continue in the same project record." | Tender status and contractor links.
| 8:05 | Community tab / notifications | "Consultation records and multi-channel notifications keep the process participatory and evidenced." | Gram Sabha record, notification log.
| 8:35 | Return to dashboard → Field Verification | "Field officers can verify parcels on mobile; offline work is queued and synchronized when connectivity returns." | Field list, verification workflow, offline banner if shown.
| 9:15 | Open `/app/reports` | "Decision-makers get portfolio-level MIS reporting instead of manually consolidating spreadsheets." | Report builder / exports.
| 9:50 | Return to `/projects` public view | "The same lifecycle closes the transparency loop: residents can see project status and use the grievance channel." | Public status and tracking.

## Role-switch moments

- **District (Koraput):** operational coordination, project actions, field work.
- **State Govt (Odisha):** state-level approval and portfolio oversight.
- **Central (DoLR):** central oversight and policy-level portfolio view.
- **Project Agency (NHAI):** delivery/tender-oriented view.
- **Field Officer:** verification-oriented view.

## If a live action is requested

1. State the role you are using.
2. Read the stage and action label aloud before clicking.
3. Show the updated stage history / notification after the action.
4. Do not attempt to bypass a legal stay just to make the demo move faster — the blocked action demonstrates an important safeguard.

## Fallback plan

- **Map does not load:** show `land-acquisition-lifecycle.svg`, then continue with documents, families, legal and reports.
- **Database is not seeded:** run `npm run db:push`, then `npm run db:seed`, then refresh.
- **Server needs a restart:** stop it with `Ctrl+C`, run `npm run dev`, and use the PDF handout while it starts.
- **External email / WhatsApp is unavailable:** describe it as an optional integration. Do not sign in to a personal account during the jury presentation.

## Closing statement

"TN-GLMS turns a legally sensitive, multi-agency process into one auditable lifecycle: citizens can see what is happening, officers can act with the right controls, and decision-makers can see where intervention is needed."
