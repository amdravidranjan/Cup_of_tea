import { desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

export interface NoticeDraft {
  id: string;
  projectId: string;
  familyId: string | null;
  draftText: string;
  status: "DRAFT" | "APPROVED";
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
}

function toDraft(row: typeof schema.noticeDrafts.$inferSelect): NoticeDraft {
  return {
    id: row.id,
    projectId: row.projectId,
    familyId: row.familyId,
    draftText: row.draftText,
    status: row.status as "DRAFT" | "APPROVED",
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    createdAt: row.createdAt,
  };
}

export async function createNoticeDraftWith(
  database: Db,
  input: { projectId: string; familyId?: string; draftText: string }
): Promise<string> {
  const id = crypto.randomUUID();
  await database.insert(schema.noticeDrafts).values({
    id,
    projectId: input.projectId,
    familyId: input.familyId ?? null,
    draftText: input.draftText,
    status: "DRAFT",
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date(),
  });
  return id;
}

export async function listNoticeDraftsForProjectWith(
  database: Db,
  projectId: string
): Promise<NoticeDraft[]> {
  const rows = await database
    .select()
    .from(schema.noticeDrafts)
    .where(eq(schema.noticeDrafts.projectId, projectId))
    .orderBy(desc(schema.noticeDrafts.createdAt));
  return rows.map(toDraft);
}

export async function getNoticeDraftByIdWith(database: Db, id: string): Promise<NoticeDraft | null> {
  const rows = await database.select().from(schema.noticeDrafts).where(eq(schema.noticeDrafts.id, id));
  return rows[0] ? toDraft(rows[0]) : null;
}

export async function approveNoticeDraftWith(
  database: Db,
  id: string,
  input: { editedText: string; approvedBy: string }
): Promise<void> {
  await database
    .update(schema.noticeDrafts)
    .set({
      draftText: input.editedText,
      status: "APPROVED",
      approvedBy: input.approvedBy,
      approvedAt: new Date(),
    })
    .where(eq(schema.noticeDrafts.id, id));
}

export const createNoticeDraft = (input: {
  projectId: string;
  familyId?: string;
  draftText: string;
}) => createNoticeDraftWith(defaultDb, input);
export const listNoticeDraftsForProject = (projectId: string) =>
  listNoticeDraftsForProjectWith(defaultDb, projectId);
export const getNoticeDraftById = (id: string) => getNoticeDraftByIdWith(defaultDb, id);
export const approveNoticeDraft = (id: string, input: { editedText: string; approvedBy: string }) =>
  approveNoticeDraftWith(defaultDb, id, input);
