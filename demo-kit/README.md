# TN-GLMS Demo Kit

Standalone assets for an end-to-end demonstration of the National Land Acquisition & Management System. Nothing in this folder is imported by or connected to the application.

## Included assets

- `live-demo-runbook.md` — presenter script, exact clicks, talking points and recovery notes.
- `land-acquisition-lifecycle.svg` — editable lifecycle drawing for slides or print.
- `platform-flow.svg` — editable architecture / stakeholder drawing.
- `TN-GLMS-demo-handout.pdf` — printable two-page presenter handout.
- `create-demo-handout.mjs` — deterministic generator for the handout if copy needs changing.

## Fast setup

Run this before the demo from the repository root:

```powershell
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The public portal is at `/`, and the staff portal is at `/app`.

## Important demo rule

Use the seeded local database. Do **not** use real personal data, real phone numbers, real email credentials, or a production WhatsApp session during the presentation.

## Rebuild the PDF

```powershell
node demo-kit/create-demo-handout.mjs
```

The generator only creates `demo-kit/TN-GLMS-demo-handout.pdf`.
