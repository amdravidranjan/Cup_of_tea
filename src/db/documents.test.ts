import { beforeEach, describe, expect, it } from "vitest";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

// See src/db/projects.test.ts for why this isn't `ReturnType<typeof drizzle>`.
let testDb: LibSQLDatabase<typeof schema>;

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
