# Documents & DPR Repository Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every project a real document repository — DPR/design-drawing/site-investigation uploads with version history and an audit trail — matching how a real land acquisition proposal is actually documented (spec Section 2.4 research). This is a deliberate prerequisite for the GIS module: the georeferenced alignment/blueprint data GIS will overlay has to come from an uploaded document, not be invented.

**Architecture:** Storage is **stubbed as the local filesystem** (a git-ignored `uploads/` directory under the project root) rather than Vercel Blob, for the same reason the foundation plan stubbed Postgres/Clerk — no external account needed to keep building this week, and the storage adapter is a single small module (`src/lib/storage.ts`) that's the only thing that needs to change to swap in Vercel Blob later. Versioning is append-only: re-uploading a document in the same category creates a new row with an incremented version number rather than overwriting, which is what "version history" and "immutable audit trail" (spec 6.4, 6.9) actually require.

**Tech Stack:** Same as prior plans — Next.js 16 App Router, Drizzle ORM over libsql, Vitest, Node's built-in `fs/promises` (no new file-upload library needed — Next.js Route Handlers parse `multipart/form-data` natively via the Fetch API's `FormData`).

**Spec:** `docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md` (Section 6.4 "Documents", Section 2.4 "What a real proposal actually contains (DPR)")

## Global Constraints

- Same as prior plans: RBAC enforced server-side, immutable audit trail, single Next.js monolith, DB/auth/storage all intentionally stubbed (SQLite, mock session, local filesystem) — no Neon/Clerk/Vercel Blob without a new explicit decision.
- File names come from user input — never trust them as a filesystem path. `saveFile` must sanitize before writing (path traversal is a real OWASP-class risk here, not a hypothetical).
- Document categories are a fixed, closed set (`DOCUMENT_CATEGORIES`), not free text — matches the real DPR content list from spec research (DPR, design drawings, site investigation, Right-of-Way plan, SIA report).

---

### Task 1: Documents table schema + category constant

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/lib/document-categories.ts`

**Interfaces:**
- Produces:
  - `documents` table: `{ id: text, projectId: text, category: text, version: integer, fileName: text, mimeType: text, sizeBytes: integer, storagePath: text, uploadedBy: text, uploadedAt: Date }`
  - `DOCUMENT_CATEGORIES: readonly ["DPR", "DESIGN_DRAWING", "SITE_INVESTIGATION", "ROW_PLAN", "SIA_REPORT", "OTHER"]` and `type DocumentCategory` — used by every later task in this plan.

- [ ] **Step 1: Write `src/lib/document-categories.ts`**

```ts
export const DOCUMENT_CATEGORIES = [
  "DPR",
  "DESIGN_DRAWING",
  "SITE_INVESTIGATION",
  "ROW_PLAN",
  "SIA_REPORT",
  "OTHER",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
```

- [ ] **Step 2: Add the `documents` table to `src/db/schema.ts`**

Append after the existing `stageHistory` table:

```ts
export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  category: text("category").notNull(),
  version: integer("version").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: text("storage_path").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).notNull(),
});
```

- [ ] **Step 3: Push the schema change and verify**

Run: `npm run db:push`
Expected: completes without error; when prompted about the new table (drizzle-kit may ask to confirm creating `documents`), confirm creation.

Verify by writing a throwaway script (delete it once run — it is not part of the codebase):

```ts
// scratch-verify.ts
import { db } from "./src/db/client";
import { documents } from "./src/db/schema";
async function main() {
  console.log(JSON.stringify(await db.select().from(documents)));
}
main();
```

Run: `npx tsx scratch-verify.ts`
Expected: prints `[]`. Delete `scratch-verify.ts` afterward.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts src/lib/document-categories.ts
git commit -m "feat: add documents table and category constants"
```

---

### Task 2: `document:upload` RBAC permission (tested)

**Files:**
- Modify: `src/lib/rbac.ts`
- Modify: `src/lib/rbac.test.ts`

**Interfaces:**
- Produces: `Permission` gains `"document:upload"`. Granted to `agency`, `district`, `field` (the roles that actually generate/collect documents); withheld from `state`/`central` (approval-only roles). Used by the upload API route (Task 5) and the upload form's visibility (Task 8).

- [ ] **Step 1: Add the failing tests** (append to the existing `describe("can", ...)` block)

```ts
it("allows agency, district, and field to upload documents", () => {
  expect(can("agency", "document:upload")).toBe(true);
  expect(can("district", "document:upload")).toBe(true);
  expect(can("field", "document:upload")).toBe(true);
});

it("does not allow state or central to upload documents", () => {
  expect(can("state", "document:upload")).toBe(false);
  expect(can("central", "document:upload")).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/rbac.test.ts`
Expected: FAIL — `document:upload` is not assignable to type `Permission` (TypeScript compile error surfaced through Vitest).

- [ ] **Step 3: Update `src/lib/rbac.ts`**

```ts
export type Permission =
  | "project:create"
  | "project:view:own"
  | "project:view:all"
  | "project:transition"
  | "document:upload";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  agency: ["project:create", "project:view:own", "project:transition", "document:upload"],
  district: ["project:create", "project:view:own", "project:transition", "document:upload"],
  state: ["project:view:all", "project:transition"],
  central: ["project:view:all", "project:transition"],
  field: ["project:view:own", "document:upload"],
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/rbac.test.ts`
Expected: PASS, 7 tests (5 existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rbac.ts src/lib/rbac.test.ts
git commit -m "feat: add document:upload permission"
```

---

### Task 3: Local filesystem storage adapter (tested)

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/lib/storage.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces:
  - `interface SavedFile { storagePath: string; sizeBytes: number }`
  - `async function saveFile(buffer: Buffer, opts: { projectId: string; category: string; fileName: string; root?: string }): Promise<SavedFile>` — sanitizes `fileName`, writes under `<root>/<projectId>/<category>/`, returns a path relative to `root`. `root` defaults to `<project>/uploads` and exists only as a test seam.
  - `async function readStoredFile(storagePath: string, root?: string): Promise<Buffer>`
  - Used by the upload/download API routes (Tasks 5, 6) and the seed script (Task 7).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/storage.test.ts
import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { saveFile, readStoredFile } from "./storage";

let testRoot: string | undefined;

afterEach(async () => {
  if (testRoot) {
    await rm(testRoot, { recursive: true, force: true });
    testRoot = undefined;
  }
});

describe("storage", () => {
  it("saves a file and reads it back with matching content and size", async () => {
    testRoot = await mkdtemp(path.join(tmpdir(), "la-storage-"));
    const content = Buffer.from("hello world");
    const { storagePath, sizeBytes } = await saveFile(content, {
      projectId: "p-1",
      category: "DPR",
      fileName: "report.pdf",
      root: testRoot,
    });
    expect(sizeBytes).toBe(content.byteLength);
    const readBack = await readStoredFile(storagePath, testRoot);
    expect(readBack.toString()).toBe("hello world");
  });

  it("sanitizes unsafe characters so no path traversal is possible", async () => {
    testRoot = await mkdtemp(path.join(tmpdir(), "la-storage-"));
    const { storagePath } = await saveFile(Buffer.from("x"), {
      projectId: "p-1",
      category: "DPR",
      fileName: "../../etc/passwd",
      root: testRoot,
    });
    expect(storagePath).not.toContain("..");
    expect(storagePath.startsWith(path.join("p-1", "DPR"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — `Cannot find module './storage'`.

- [ ] **Step 3: Write `src/lib/storage.ts`**

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_ROOT = path.join(process.cwd(), "uploads");

function sanitizeFileName(name: string): string {
  // First pass strips path separators and any other unsafe character.
  // Second pass collapses runs of ".." that survive the first pass (dots
  // are individually allowed, so "../.." becomes "_.._.._" after pass one
  // without this) — belt-and-suspenders on top of the fact that safeName
  // is used as a single path segment, so no separator ever reaches disk.
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/\.\.+/g, "_");
}

export interface SavedFile {
  storagePath: string;
  sizeBytes: number;
}

export async function saveFile(
  buffer: Buffer,
  opts: { projectId: string; category: string; fileName: string; root?: string }
): Promise<SavedFile> {
  const root = opts.root ?? DEFAULT_ROOT;
  const dir = path.join(root, opts.projectId, opts.category);
  await mkdir(dir, { recursive: true });
  const safeName = `${Date.now()}-${sanitizeFileName(opts.fileName)}`;
  await writeFile(path.join(dir, safeName), buffer);
  const storagePath = path.join(opts.projectId, opts.category, safeName);
  return { storagePath, sizeBytes: buffer.byteLength };
}

export async function readStoredFile(storagePath: string, root: string = DEFAULT_ROOT): Promise<Buffer> {
  return readFile(path.join(root, storagePath));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Add `uploads/` to `.gitignore`**

Append:

```
# local file storage (documents module)
/uploads
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts .gitignore
git commit -m "feat: add local filesystem storage adapter"
```

---

### Task 4: Documents data access layer (tested against in-memory DB)

**Files:**
- Create: `src/db/documents.ts`
- Test: `src/db/documents.test.ts`

**Interfaces:**
- Consumes: `documents` table (Task 1), `DocumentCategory` (Task 1)
- Produces:
  - `interface CreateDocumentInput { projectId: string; category: DocumentCategory; fileName: string; mimeType: string; sizeBytes: number; storagePath: string; uploadedBy: string }`
  - `async function createDocumentWith(database, input): Promise<string>` — computes the next version number for `(projectId, category)` (max existing + 1, starting at 1) and inserts. Returns the new document id.
  - `async function listDocumentsWith(database, projectId): Promise<Document[]>` — all documents (every version) for a project, newest first.
  - `async function getDocumentWith(database, id): Promise<Document | null>`
  - Zero-arg convenience wrappers `createDocument`, `listDocuments`, `getDocument` bound to the real DB — used by the API routes in Tasks 5 and 6.

- [ ] **Step 1: Write the failing tests**

```ts
// src/db/documents.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

let testDb: ReturnType<typeof drizzle>;

beforeEach(async () => {
  const client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await testDb.run(sql`
    CREATE TABLE documents (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, category TEXT NOT NULL,
      version INTEGER NOT NULL, file_name TEXT NOT NULL, mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL, storage_path TEXT NOT NULL,
      uploaded_by TEXT NOT NULL, uploaded_at INTEGER NOT NULL
    );
  `);
});

const baseInput = {
  projectId: "p-1",
  category: "DPR" as const,
  fileName: "report.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  storagePath: "p-1/DPR/report.pdf",
  uploadedBy: "u-agency-1",
};

describe("documents data layer", () => {
  it("creates the first document in a category as version 1", async () => {
    const { createDocumentWith, listDocumentsWith } = await import("./documents");
    await createDocumentWith(testDb, baseInput);
    const docs = await listDocumentsWith(testDb, "p-1");
    expect(docs).toHaveLength(1);
    expect(docs[0].version).toBe(1);
  });

  it("increments the version for a second upload in the same category", async () => {
    const { createDocumentWith, listDocumentsWith } = await import("./documents");
    await createDocumentWith(testDb, baseInput);
    await createDocumentWith(testDb, { ...baseInput, fileName: "report-v2.pdf" });
    const docs = await listDocumentsWith(testDb, "p-1");
    expect(docs).toHaveLength(2);
    expect(docs.map((d) => d.version).sort()).toEqual([1, 2]);
  });

  it("keeps version numbering independent per category", async () => {
    const { createDocumentWith, listDocumentsWith } = await import("./documents");
    await createDocumentWith(testDb, baseInput);
    await createDocumentWith(testDb, {
      ...baseInput,
      category: "DESIGN_DRAWING",
      fileName: "drawing.pdf",
    });
    const docs = await listDocumentsWith(testDb, "p-1");
    expect(docs.find((d) => d.category === "DESIGN_DRAWING")?.version).toBe(1);
  });

  it("scopes documents to their project", async () => {
    const { createDocumentWith, listDocumentsWith } = await import("./documents");
    await createDocumentWith(testDb, baseInput);
    await createDocumentWith(testDb, { ...baseInput, projectId: "p-2", fileName: "b.pdf" });
    const docsP1 = await listDocumentsWith(testDb, "p-1");
    expect(docsP1).toHaveLength(1);
    expect(docsP1[0].fileName).toBe("report.pdf");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/db/documents.test.ts`
Expected: FAIL — `Cannot find module './documents'`.

- [ ] **Step 3: Write `src/db/documents.ts`**

```ts
import { and, desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import { documents } from "./schema";
import * as schema from "./schema";
import type { DocumentCategory } from "@/lib/document-categories";

type Db = LibSQLDatabase<typeof schema>;

export interface CreateDocumentInput {
  projectId: string;
  category: DocumentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedBy: string;
}

export async function createDocumentWith(
  database: Db,
  input: CreateDocumentInput
): Promise<string> {
  const existing = await database
    .select()
    .from(documents)
    .where(
      and(eq(documents.projectId, input.projectId), eq(documents.category, input.category))
    );
  const nextVersion = existing.reduce((max, d) => Math.max(max, d.version), 0) + 1;
  const id = crypto.randomUUID();
  await database.insert(documents).values({
    id,
    projectId: input.projectId,
    category: input.category,
    version: nextVersion,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    storagePath: input.storagePath,
    uploadedBy: input.uploadedBy,
    uploadedAt: new Date(),
  });
  return id;
}

export async function listDocumentsWith(database: Db, projectId: string) {
  return database
    .select()
    .from(documents)
    .where(eq(documents.projectId, projectId))
    .orderBy(desc(documents.uploadedAt));
}

export async function getDocumentWith(database: Db, id: string) {
  const rows = await database.select().from(documents).where(eq(documents.id, id));
  return rows[0] ?? null;
}

export const createDocument = (input: CreateDocumentInput) =>
  createDocumentWith(defaultDb, input);
export const listDocuments = (projectId: string) => listDocumentsWith(defaultDb, projectId);
export const getDocument = (id: string) => getDocumentWith(defaultDb, id);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/db/documents.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/db/documents.ts src/db/documents.test.ts
git commit -m "feat: add documents data access layer with per-category versioning"
```

---

### Task 5: Upload + list API route

**Files:**
- Create: `src/app/api/projects/[id]/documents/route.ts`

**Interfaces:**
- Consumes: `getSession` (`@/lib/auth`), `can` (`@/lib/rbac`), `createDocument`/`listDocuments` (`@/db/documents`), `saveFile` (`@/lib/storage`), `DOCUMENT_CATEGORIES` (`@/lib/document-categories`)
- Produces:
  - `GET /api/projects/[id]/documents` → `{ documents: Document[] }` (401 if no session)
  - `POST /api/projects/[id]/documents` — `multipart/form-data` with fields `category` and `file` → `{ id: string }`, 201 (401/403 as elsewhere; 400 for a missing/invalid category or file)

- [ ] **Step 1: Write `src/app/api/projects/[id]/documents/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createDocument, listDocuments } from "@/db/documents";
import { saveFile } from "@/lib/storage";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/document-categories";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const docs = await listDocuments(id);
  return NextResponse.json({ documents: docs });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "document:upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const form = await request.formData();
  const file = form.get("file");
  const category = form.get("category");
  if (!(file instanceof File) || typeof category !== "string") {
    return NextResponse.json({ error: "Missing file or category" }, { status: 400 });
  }
  if (!DOCUMENT_CATEGORIES.includes(category as DocumentCategory)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const { storagePath, sizeBytes } = await saveFile(buffer, {
    projectId: id,
    category,
    fileName: file.name,
  });
  const docId = await createDocument({
    projectId: id,
    category: category as DocumentCategory,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes,
    storagePath,
    uploadedBy: session.userId,
  });
  return NextResponse.json({ id: docId }, { status: 201 });
}
```

- [ ] **Step 2: Manually verify with the dev server**

```bash
npm run dev &
sleep 3
curl -s -c /tmp/c.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d '{"userId":"u-agency-1"}' > /dev/null

# create a small test file and upload it
echo "test DPR content" > /tmp/test-dpr.txt
curl -s -i -b /tmp/c.txt -X POST http://localhost:3000/api/projects/p-demo-bridge-1/documents \
  -F "category=DPR" -F "file=@/tmp/test-dpr.txt"

curl -s -b /tmp/c.txt http://localhost:3000/api/projects/p-demo-bridge-1/documents
```

Expected: upload returns `201` with an `{"id": "..."}`; the list call returns `{"documents":[{... "fileName":"test-dpr.txt", "version":1, "category":"DPR" ...}]}`. Confirm the file actually landed on disk: `ls uploads/p-demo-bridge-1/DPR/`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/projects/[id]/documents
git commit -m "feat: add document upload and list API route"
```

---

### Task 6: Download API route

**Files:**
- Create: `src/app/api/documents/[id]/download/route.ts`

**Interfaces:**
- Consumes: `getSession`, `getDocument` (`@/db/documents`), `readStoredFile` (`@/lib/storage`)
- Produces: `GET /api/documents/[id]/download` → the raw file bytes with `Content-Type` set to the stored mime type and `Content-Disposition: attachment` (401 if no session, 404 if the document id doesn't exist).

- [ ] **Step 1: Write `src/app/api/documents/[id]/download/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDocument } from "@/db/documents";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buffer = await readStoredFile(doc.storagePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${doc.fileName}"`,
    },
  });
}
```

- [ ] **Step 2: Manually verify**

Using the document id returned by Task 5's upload:

```bash
curl -s -b /tmp/c.txt http://localhost:3000/api/documents/<id>/download
```

Expected: prints `test DPR content` (the file's actual contents) to stdout, confirming round-trip storage and retrieval works.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/documents
git commit -m "feat: add document download API route"
```

---

### Task 7: Seed a demo document

**Files:**
- Modify: `src/db/seed.ts`

**Interfaces:**
- Consumes: `saveFile` (`@/lib/storage`), `createDocument` (`./documents`)
- Produces: the seeded demo project now has one DPR document on first `npm run db:seed`, so the document list isn't empty on first load of the app.

- [ ] **Step 1: Add to `src/db/seed.ts`**

Add these imports at the top:

```ts
import { saveFile } from "@/lib/storage";
import { createDocument } from "./documents";
```

Add before the final `console.log` line in `main()`:

```ts
  const dprContent = Buffer.from(
    "Detailed Project Report (demo)\nKoraput River Bridge Project\nPublic purpose: NH-26 connectivity.\n"
  );
  const { storagePath, sizeBytes } = await saveFile(dprContent, {
    projectId,
    category: "DPR",
    fileName: "koraput-bridge-dpr.txt",
  });
  await createDocument({
    projectId,
    category: "DPR",
    fileName: "koraput-bridge-dpr.txt",
    mimeType: "text/plain",
    sizeBytes,
    storagePath,
    uploadedBy: "u-agency-1",
  });
```

- [ ] **Step 2: Re-seed and verify**

The seed script isn't idempotent for documents (no `onConflictDoNothing` — each run adds a new version, which is correct versioning behavior, not a bug). Delete the local DB and uploads to start clean, then reseed:

```bash
rm -f local.db local.db-*
rm -rf uploads
npm run db:push
npm run db:seed
```

Expected: `Seed complete: 5 demo users, 1 demo project.` with no errors, and `uploads/p-demo-bridge-1/DPR/` contains the seeded file.

- [ ] **Step 3: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: seed a demo DPR document for the sample project"
```

---

### Task 8: Documents UI on the project detail page

**Files:**
- Create: `src/components/document-upload.tsx`
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `DOCUMENT_CATEGORIES` (`@/lib/document-categories`), `listDocuments` (`@/db/documents`), `can` (`@/lib/rbac`)
- Produces: a "Documents" section on the project detail page — an upload form (visible only to roles with `document:upload`) and a list of all uploaded documents with a working download link.

No automated test — same rationale as prior UI tasks. Verified manually.

- [ ] **Step 1: Write `src/components/document-upload.tsx`**

```tsx
"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DOCUMENT_CATEGORIES } from "@/lib/document-categories";

export function DocumentUpload({ projectId }: { projectId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/projects/${projectId}/documents`, {
      method: "POST",
      body: formData,
    });
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Upload failed");
      return;
    }
    formRef.current?.reset();
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2"
    >
      <div>
        <label className="block text-xs text-gray-500" htmlFor="category">
          Category
        </label>
        <select
          id="category"
          name="category"
          required
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        >
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500" htmlFor="file">
          File
        </label>
        <input id="file" name="file" type="file" required className="text-sm" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
      >
        {pending ? "Uploading..." : "Upload"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Modify `src/app/(dashboard)/projects/[id]/page.tsx`**

Add these imports:

```ts
import { listDocuments } from "@/db/documents";
import { can } from "@/lib/rbac";
import { DocumentUpload } from "@/components/document-upload";
```

Add this fetch alongside the existing `history` fetch:

```ts
  const docs = await listDocuments(id);
  const canUpload = can(session.role, "document:upload");
```

Add this section after the "History" section (before the closing `</div>` of the outer container):

```tsx
      <div>
        <h3 className="mb-2 text-sm font-medium">Documents</h3>
        {canUpload ? (
          <DocumentUpload projectId={project.id} />
        ) : (
          <p className="text-sm text-gray-500">Your role cannot upload documents.</p>
        )}
        <ul className="mt-3 space-y-1 text-sm text-gray-600">
          {docs.length === 0 ? (
            <li className="text-gray-400">No documents uploaded yet.</li>
          ) : (
            docs.map((d) => (
              <li key={d.id}>
                <a
                  href={`/api/documents/${d.id}/download`}
                  className="hover:underline"
                >
                  {d.fileName}
                </a>{" "}
                — {d.category} v{d.version}, {(d.sizeBytes / 1024).toFixed(1)} KB, by{" "}
                {d.uploadedBy} on {d.uploadedAt.toLocaleString()}
              </li>
            ))
          )}
        </ul>
      </div>
```

- [ ] **Step 3: Manually verify in the browser or via curl**

```bash
curl -s -b /tmp/c.txt http://localhost:3000/projects/p-demo-bridge-1 | grep -o "koraput-bridge-dpr.txt"
```

Expected: prints the seeded document's filename, confirming the list renders. In a browser: log in as District or Agency, see the upload form; log in as State or Central, see "Your role cannot upload documents." instead. Upload a file and confirm it appears in the list immediately without a full reload.

- [ ] **Step 4: Commit**

```bash
git add src/components/document-upload.tsx "src/app/(dashboard)/projects/[id]/page.tsx"
git commit -m "feat: add documents section to project detail page"
```

---

## What this plan does not cover

- Document checklist / missing-doc flags blocking stage progression (spec 6.4, marked 🟡 — deferred to a later pass)
- Auto-generated official documents (notification, award letter, possession certificate) from templates (spec 6.4)
- E-signature stub
- Wiring the uploaded alignment/design data into an actual GIS map overlay — that's the next plan, and it depends on this one existing
- Swapping local filesystem storage for Vercel Blob, once provisioned
