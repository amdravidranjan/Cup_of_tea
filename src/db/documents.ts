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
