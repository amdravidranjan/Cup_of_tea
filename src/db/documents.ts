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

/**
 * Which of a project's documents have already been turned into records.
 * Drives the "already read into the register" state on the documents tab,
 * so an officer cannot create the same parcel twice from one FMB sheet.
 */
export async function listIngestedDocumentIdsWith(
  database: Db,
  projectId: string
): Promise<Set<string>> {
  const [parcelRows, familyRows] = await Promise.all([
    database
      .select({ sourceDocumentId: schema.parcels.sourceDocumentId })
      .from(schema.parcels)
      .where(eq(schema.parcels.projectId, projectId)),
    database
      .select({ sourceDocumentId: schema.families.sourceDocumentId })
      .from(schema.families)
      .where(eq(schema.families.projectId, projectId)),
  ]);
  const ids = new Set<string>();
  for (const row of [...parcelRows, ...familyRows]) {
    if (row.sourceDocumentId) ids.add(row.sourceDocumentId);
  }
  return ids;
}

export const createDocument = (input: CreateDocumentInput) =>
  createDocumentWith(defaultDb, input);
export const listIngestedDocumentIds = (projectId: string) =>
  listIngestedDocumentIdsWith(defaultDb, projectId);
export const listDocuments = (projectId: string) => listDocumentsWith(defaultDb, projectId);
export const getDocument = (id: string) => getDocumentWith(defaultDb, id);

/**
 * Corrects a document's filing details.
 *
 * The stored bytes are never touched — a document on a statutory file is
 * evidence, and replacing its contents in place would destroy the thing the
 * repository exists to hold. Filing it under the wrong category, though, is
 * an ordinary clerical error, and re-categorising it is a correction the
 * audit trail records rather than a rewrite of history.
 */
export interface UpdateDocumentInput {
  category?: DocumentCategory;
  fileName?: string;
}

export async function updateDocumentWith(
  database: Db,
  id: string,
  input: UpdateDocumentInput
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.category !== undefined) patch.category = input.category;
  if (input.fileName !== undefined) patch.fileName = input.fileName;
  if (Object.keys(patch).length === 0) return;
  await database.update(documents).set(patch).where(eq(documents.id, id));
}

/**
 * Every version of a category on a project, newest first.
 *
 * Version numbers are per project + category (see `createDocumentWith`), so a
 * re-uploaded award letter becomes v2 rather than overwriting v1. This is the
 * read side of that: the version history requirement 13 asks for.
 */
export async function listDocumentVersionsWith(
  database: Db,
  projectId: string,
  category: string
) {
  return database
    .select()
    .from(documents)
    .where(and(eq(documents.projectId, projectId), eq(documents.category, category)))
    .orderBy(desc(documents.version));
}

export const updateDocument = (id: string, input: UpdateDocumentInput) =>
  updateDocumentWith(defaultDb, id, input);
export const listDocumentVersions = (projectId: string, category: string) =>
  listDocumentVersionsWith(defaultDb, projectId, category);
