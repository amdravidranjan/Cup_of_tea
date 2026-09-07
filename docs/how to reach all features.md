# How to Reach All Features Through the UI

This is the click-through guide for demonstrating the features listed in
`docs/all-features (1).md`. Use the demo login at `/login`; do not navigate by
typing internal URLs during a demonstration.

## Start here

1. Open the public portal landing page.
2. Click **Login / Register** in the top-right navigation.
3. Choose a demo role. The role controls which actions and tabs are visible.
4. After login, use the **Switch demo role** control in the top-right when a
   different role is needed.

## Public portal

| Demonstration | UI path |
|---|---|
| Portfolio stats, project search, recent notices | Click **Home** |
| Public project directory | Open **Projects → View All Projects** |
| Request a project | Open **Projects → Request a Project**, complete the form, and submit |
| Track a project request or grievance | Open **Track**, choose the relevant tab, and enter the tracking number |
| Project stage, map, before/after, elevation, disputes, and grievance | Open **Projects → View All Projects**, then click a project |
| Compensation calculator | Open **Compensation → Compensation Calculator** |
| Public R&R information | Open **R&R → R&R Scheme Status** or **Entitlement Tracker** |
| Public documents | Open **Documents**, then choose a document category |
| Voice status assistant | Use the floating assistant on any public page |
| Developer API documentation | Open **Resources → Developer API** if shown in the header/footer |

The public portal does not require login. A project appears publicly only after
it reaches the `NOTIFIED` stage or a later stage.

## Internal dashboard

After selecting a role at login:

| Demonstration | UI path |
|---|---|
| Dashboard project list and stats | Click **Dashboard** or the NILAMS logo |
| Global search | Use the search field in the internal header |
| Notifications relevant to the signed-in role | Click the bell icon in the internal header |
| Interoperability contract references | Open **More → Interoperability** |
| Project request review | Open **More → Project Requests** as a district or state user |
| Grievance review | Open **More → Grievances** |
| Reports and CSV export | Open **More → Reports** |
| Contractors and tender history | Open **More → Contractors** |
| District workload | Open **More → Workload** |
| Title-chain conflicts | Open **More → Title Conflicts** |
| Encroachment monitoring | Open **More → Encroachment** |
| Cross-project land bank | Open **More → Land Bank** |
| Audit trail | Open **More → Audit** and use **Verify chain** |

Some **More** entries are role-gated. If an item is not visible, switch to a
role with the required permission.

## Project workspace

1. From the dashboard, click a project in the project list.
2. Use the tabs in the project workspace:

| Tab | Demonstration |
|---|---|
| **Overview** | Review stage dates, risk assessment, map, parcel coloring, before/after comparison, elevation profile, 3D view where available, and stage history |
| **Compensation** | Set or review the official rate, inspect parcel calculations, and mark compensation paid |
| **R&R & Families** | Review R&R stage, register families, grant entitlements, record succession, and manage rehabilitation services |
| **Infrastructure** | Complete the resettlement infrastructure checklist and manage acquired-but-unused parcels in the land bank |
| **Legal** | Add or review disputes; flag/clear a stay order and observe blocked compensation/possession actions |
| **Tenders** | Publish a tender, award it to an existing/new contractor, and advance its status |
| **Community** | Record Gram Sabha consultations and send/log notices to affected families |
| **Documents** | Upload documents, inspect the checklist, generate statutory documents, ingest land records, and review extraction/notice drafts |

The **R&R & Families** tab is available for family registration before R&R
starts because the affected-family register is created during the SIA census and
land-record intake. R&R actions and rehabilitation facilitation become active
at `RR_IN_PROGRESS`.

The **Infrastructure** checklist becomes active at `POSSESSION`. The land-bank
register remains available in that tab for managing acquired-but-unused parcels.

## Adding affected families

In a project, open **R&R & Families → Affected Families**.

1. Click **Register family**.
2. Enter the head of household, village, household size, and optional contact
   details.
3. Choose **Landowner** for a titleholder.
4. Choose **Tenant** or **Livelihood loser** for a non-titleholder.
5. Select the **Basis for entitlement — RFCTLARR s.3(c)** for the affected
   family.
6. Mark the vulnerable-group checkbox where applicable.
7. Submit with **Register family**.

Landowners can also be created by opening **Documents → Bulk land-record
intake**, uploading a supported extract, reviewing the preview, and committing
the intake. Non-landowners must be captured through the survey/register form
because they do not normally appear in a patta extract.

## Community consultations and notifications

Open a project and select **Community**.

### Gram Sabha

Use **Add consultation** to enter the village, date, attendance, minutes, and
resolution. This is appropriate during the SIA/public-consultation part of the
workflow and does not require the project to be in R&R.

### Family notifications

1. First register the affected family with a contact email or phone number if
   email/WhatsApp delivery is required.
2. Open **Community → Notifications to Affected Families**.
3. Click **Notify a family**.
4. Select the family and channel.
5. Click **Send**.

Family notifications are enabled from the `SIA` stage onward. They are blocked
in `DRAFT` and `SCRUTINY`, because the affected-family/SIA basis should exist
before outreach is sent.

The correct interpretation is:

- **SIA stage:** appropriate for SIA consultation, Gram Sabha/public-hearing
  communication, family enumeration follow-up, and requests for information.
- **NOTIFIED stage:** appropriate for the statutory preliminary acquisition
  notice and objection window under Section 11.
- **DECLARED/AWARDED/RR_IN_PROGRESS:** appropriate for declaration updates,
  compensation, and R&R/entitlement communications respectively.

The current notification form is a manual communication log, not an automatic
stage-triggered sender. Staff must deliberately choose a family and channel.
Email and WhatsApp attempt real delivery; voice and SMS are simulated; postal
starts as `QUEUED` and must be updated after the physical notice is handed to
the postal service.

### Email demonstration

1. Add the family's email on the **Register family** form.
2. Configure `GMAIL_USER` and `GMAIL_APP_PASSWORD` as described in
   `docs/NOTIFICATIONS.md`.
3. Open **Community → Notifications to Affected Families**.
4. Choose **Email** and click **Send**.
5. Confirm the notification row shows `SENT` or `FAILED` with the provider
   reason.

### WhatsApp demonstration

1. Add the family's phone number on the **Register family** form.
2. Start the application and scan the QR code printed in the server terminal
   using **WhatsApp → Settings → Linked Devices → Link a Device**.
3. Wait for the terminal to show `[whatsapp] connected`.
4. Open **Community → Notifications to Affected Families**.
5. Choose **WhatsApp** and click **Send**.
6. Confirm the notification row shows `SENT` or `FAILED`.

The QR code is intentionally not displayed in the browser. Use a spare linked
WhatsApp number for demonstrations.

## Notification status meanings

| Status | Meaning |
|---|---|
| `QUEUED` | Postal notice is recorded but has not yet been handed to the postal service |
| `SENT` | Provider accepted the email/WhatsApp send, or the voice/SMS demo entry was recorded |
| `DELIVERED` | Delivery was confirmed/recorded by the relevant workflow |
| `FAILED` | A real provider attempt failed, or required contact/configuration was missing |

## Feature-status notes

The listed feature surfaces and UI workflows are present. The following are
intentional limitations documented in `docs/all-features (1).md`:

- Voice and SMS are demo-simulated; no telephony/SMS provider is connected.
- Encroachment detection, risk scoring, land-rate prediction, and unsupported
  document extraction are deterministic explainable logic, not trained models.
- Notice drafting is a template generator and still requires human approval.
- Workload is grouped by district, not individual staff members.
- Email and WhatsApp require local sender configuration and can show `FAILED`
  when credentials, contact information, or WhatsApp linking is unavailable.

