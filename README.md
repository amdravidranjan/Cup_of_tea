# National Land Acquisition & Management System

An SIH Problem Statement 26016 prototype for the Ministry of Rural Development's Department of Land Resources. The application manages the land-acquisition lifecycle under the RFCTLARR Act, 2013: proposals, approvals, compensation, rehabilitation and resettlement (R&R), GIS, documents, field verification, and a public transparency portal.

The product/design reference and the current implementation record live in [`docs/superpowers/specs`](docs/superpowers/specs). Read [`PROJECT-STATUS.md`](docs/superpowers/specs/PROJECT-STATUS.md) before starting work.

## Stack

- Next.js 16.3, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- Drizzle ORM with a local SQLite/LibSQL database by default
- MapLibre GL for maps, Recharts for dashboards, Vitest for tests

## Get the project running

### Prerequisites

- Node.js 20 or later
- Git

### First-time setup

```bash
git clone https://github.com/amdravidranjan/Cup_of_tea.git
cd Cup_of_tea
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The public portal is at `/`; the internal dashboard is at `/app`.

The local database is `local.db`. It is intentionally ignored by Git, so each teammate needs to create and seed their own copy. `npm run db:seed` may fetch elevation data once; it degrades gracefully if the service is unavailable.

### Useful commands

| Command | Use |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run test` | Run the Vitest suite. |
| `npx tsc --noEmit` | Type-check the project. |
| `npm run lint` | Run ESLint. |
| `npm run build` | Make a production build; run this before a PR when possible. |
| `npm run db:push` | Apply the current Drizzle schema to the local database. |
| `npm run db:seed` | Populate local demo users, projects, parcels, and workflow data. |
| `npm run db:studio` | Open Drizzle Studio for inspecting local data. |

After pulling changes that touch `src/db/schema.ts`, run `npm run db:push`. If seed data changed or your local data is stale, run `npm run db:seed` as well.

## Team Git workflow

> [!CAUTION]
> **Do not commit or push directly to `main`.** `main` is the shared integration branch. Every code or documentation change must go through a separate branch and a pull request.

Start each task from an up-to-date `main`:

```bash
git switch main
git pull origin main
git switch -c feat/short-description
```

Use a clear branch prefix:

- `feat/...` — new feature
- `fix/...` — bug fix
- `docs/...` — documentation-only change
- `refactor/...` — internal cleanup with no intended behaviour change
- `test/...` — test-only change

Before pushing, review exactly what will be included:

```bash
git status
git diff --check
npm run test
npx tsc --noEmit
git add <specific-files>
git commit -m "feat: concise description"
git push -u origin feat/short-description
```

Then create a pull request on GitHub from your branch **into `main`**. Include:

1. What changed and why.
2. The affected route/module.
3. Tests/checks run and their result.
4. Any database, seed-data, environment, or reviewer follow-up needed.
5. Screenshots/video for visible UI or map changes.

Keep PRs small and focused. Do not mix unrelated refactors, generated files, `local.db`, or `uploads/` with feature work. Resolve merge conflicts on your branch, not by pushing to `main`.

### Keeping an open branch current

```bash
git fetch origin
git merge origin/main
# resolve conflicts, test, commit the merge if necessary
git push
```

If your branch has not been shared yet, rebasing onto `origin/main` is also acceptable. Never force-push another teammate's branch.

## Code map and suggested ownership

Ownership means the first person/team to contact before changing that area. It does not prevent collaboration; coordinate before making overlapping changes.

| Area | Primary code | What it owns |
| --- | --- | --- |
| App shell, routes, page composition | `src/app/` | Public portal, internal dashboard, field pages, route handlers, layouts, metadata. |
| Public portal | `src/app/(public)/`, `src/components/public-project-search.tsx`, `src/components/track-grievance.tsx` | No-login project discovery, public project details, grievance tracking/submission. |
| Internal workflow & project actions | `src/app/app/projects/[id]/`, `src/components/project-actions.tsx`, `src/components/stage-tracker.tsx`, `src/lib/workflow.ts` | Lifecycle stages, approval actions, stage history and permissions. |
| Authentication and RBAC | `src/lib/auth.ts`, `src/lib/rbac.ts`, `src/app/api/auth/` | Demo session handling, roles, permission checks. Enforce access on the server/API layer. |
| Database & seed data | `src/db/schema.ts`, `src/db/client.ts`, `src/db/*.ts`, `src/db/seed.ts`, `src/db/seed-data.ts` | Drizzle schema, persistence queries, test fixtures, demo data. Coordinate schema edits and run `db:push`. |
| Compensation & R&R | `src/db/compensation.ts`, `src/lib/compensation.ts`, `src/db/families.ts`, `src/db/infrastructure.ts`, `src/components/compensation-panel.tsx`, `src/components/rr-panel.tsx` | Awards, disbursements, household entitlements, R&R workflow, infrastructure checklist. |
| GIS & parcel data | `src/components/project-map.tsx`, `src/components/project-3d-view.tsx`, `src/components/before-after-slider.tsx`, `src/components/elevation-profile.tsx`, `src/lib/geo.ts`, `src/lib/parcel-generation.ts` | Map layers, parcels, alignments, terrain/profile and 3D visualisation. |
| Field and offline experience | `src/app/app/field/`, `src/components/field-*`, `src/components/offline-banner.tsx`, `src/lib/offline-queue.ts`, `public/sw.js` | Mobile verification, queued offline actions, service worker behaviour. |
| Documents and generated PDFs | `src/db/documents.ts`, `src/components/document-upload.tsx`, `src/components/generate-document.tsx`, `src/lib/generated-documents.ts`, `src/lib/storage.ts` | Upload/version records, downloads, official-document PDF generation. |
| Dashboards, reports, notices | `src/db/dashboard.ts`, `src/components/dashboard-stats.tsx`, `src/components/report-builder.tsx`, `src/components/notification-bell.tsx`, `src/db/notifications.ts` | Dashboard aggregation, SLA reporting, CSV exports, in-app notifications. |
| Shared design system | `src/app/globals.css`, `src/components/ui/`, `src/lib/status-colors.ts`, `src/lib/format.ts` | Design tokens, reusable UI components, status colours, India-specific formatting. |
| Tests | `src/**/*.test.ts` | Unit/data-layer coverage. Add or update tests alongside behaviour changes. |

## Development rules

- Use the `@/*` import alias for files under `src/`.
- Keep business rules in `src/lib/` and persistence queries in `src/db/`; avoid putting them only in page components.
- Add server-side permission checks to every API route that writes data. Hiding a UI button is not security.
- For a schema change: update `src/db/schema.ts`, add/update data-layer tests, run `npm run db:push`, and document any seed-data effect in the PR.
- For a visible change: check desktop and mobile layouts, and include a screenshot in the PR.
- Do not commit `.env*`, `local.db*`, `uploads/`, `.next/`, or `node_modules/`.
- Read the relevant document in `docs/superpowers/specs/` and `docs/superpowers/plans/` before extending an existing feature.
- This repository uses a newer Next.js version. Consult the relevant local guide in `node_modules/next/dist/docs/` before changing Next.js APIs, routing, or conventions.

## Where to start

1. Read [`PROJECT-STATUS.md`](docs/superpowers/specs/PROJECT-STATUS.md) for completed work and known gaps.
2. Check the matching spec/plan in `docs/superpowers/`.
3. Search for the relevant module and its `*.test.ts` file.
4. Create a branch, make a focused change, run checks, and open a PR.

## Documentation index

- [`docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md`](docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md) — product, legislation, architecture, roles, workflow and feature priorities.
- [`docs/superpowers/specs/PROJECT-STATUS.md`](docs/superpowers/specs/PROJECT-STATUS.md) — current implementation status, verification record, and remaining work.
- [`docs/superpowers/specs/`](docs/superpowers/specs) — detailed designs for the UI foundation, R&R, affected families, dashboards and public portal.
- [`docs/superpowers/plans/`](docs/superpowers/plans) — original implementation plans and module-level test guidance.
