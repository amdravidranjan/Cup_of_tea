import { desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

export const DISPUTE_STATUSES = ["FILED", "HEARING", "STAYED", "DISPOSED"] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export interface LegalDispute {
  id: string;
  projectId: string;
  caseNumber: string;
  court: string;
  title: string;
  partyName: string | null;
  status: DisputeStatus;
  filedDate: Date;
  nextHearingDate: Date | null;
  summary: string;
  outcome: string | null;
  isStayOrder: boolean;
  stayClearedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

function toDispute(row: typeof schema.legalDisputes.$inferSelect): LegalDispute {
  return {
    id: row.id,
    projectId: row.projectId,
    caseNumber: row.caseNumber,
    court: row.court,
    title: row.title,
    partyName: row.partyName,
    status: row.status as DisputeStatus,
    filedDate: row.filedDate,
    nextHearingDate: row.nextHearingDate,
    summary: row.summary,
    outcome: row.outcome,
    isStayOrder: row.isStayOrder,
    stayClearedAt: row.stayClearedAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface CreateDisputeInput {
  projectId: string;
  caseNumber: string;
  court: string;
  title: string;
  partyName?: string;
  filedDate: Date;
  nextHearingDate?: Date;
  summary: string;
  isStayOrder?: boolean;
  createdBy: string;
}

export async function createLegalDisputeWith(
  database: Db,
  input: CreateDisputeInput
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  await database.insert(schema.legalDisputes).values({
    id,
    projectId: input.projectId,
    caseNumber: input.caseNumber,
    court: input.court,
    title: input.title,
    partyName: input.partyName ?? null,
    status: "FILED",
    filedDate: input.filedDate,
    nextHearingDate: input.nextHearingDate ?? null,
    summary: input.summary,
    outcome: null,
    isStayOrder: input.isStayOrder ?? false,
    stayClearedAt: null,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function listLegalDisputesForProjectWith(
  database: Db,
  projectId: string
): Promise<LegalDispute[]> {
  const rows = await database
    .select()
    .from(schema.legalDisputes)
    .where(eq(schema.legalDisputes.projectId, projectId))
    .orderBy(desc(schema.legalDisputes.filedDate));
  return rows.map(toDispute);
}

export async function listAllLegalDisputesWith(database: Db): Promise<LegalDispute[]> {
  const rows = await database
    .select()
    .from(schema.legalDisputes)
    .orderBy(desc(schema.legalDisputes.filedDate));
  return rows.map(toDispute);
}

export async function getLegalDisputeByIdWith(
  database: Db,
  id: string
): Promise<LegalDispute | null> {
  const rows = await database.select().from(schema.legalDisputes).where(eq(schema.legalDisputes.id, id));
  return rows[0] ? toDispute(rows[0]) : null;
}

export async function updateLegalDisputeWith(
  database: Db,
  id: string,
  input: { status?: DisputeStatus; nextHearingDate?: Date | null; outcome?: string }
): Promise<void> {
  await database
    .update(schema.legalDisputes)
    .set({
      ...(input.status ? { status: input.status } : {}),
      ...(input.nextHearingDate !== undefined ? { nextHearingDate: input.nextHearingDate } : {}),
      ...(input.outcome !== undefined ? { outcome: input.outcome } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.legalDisputes.id, id));
}

/** Logs a stay order as cleared — the "auto-unblock on a logged
 * clearance" half of the stay-order gate. */
export async function clearStayWith(database: Db, id: string): Promise<void> {
  await database
    .update(schema.legalDisputes)
    .set({ stayClearedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.legalDisputes.id, id));
}

/** True if this project has any stay order that's active (flagged as a
 * stay order, not yet logged as cleared, and the case itself isn't
 * disposed) — used to block compensation-pay and parcel-status actions. */
export async function hasActiveStayWith(database: Db, projectId: string): Promise<boolean> {
  const rows = await database
    .select()
    .from(schema.legalDisputes)
    .where(eq(schema.legalDisputes.projectId, projectId));
  return rows.some(
    (r) => r.isStayOrder && !r.stayClearedAt && r.status !== "DISPOSED"
  );
}

export const createLegalDispute = (input: CreateDisputeInput) =>
  createLegalDisputeWith(defaultDb, input);
export const listLegalDisputesForProject = (projectId: string) =>
  listLegalDisputesForProjectWith(defaultDb, projectId);
export const listAllLegalDisputes = () => listAllLegalDisputesWith(defaultDb);
export const getLegalDisputeById = (id: string) => getLegalDisputeByIdWith(defaultDb, id);
export const updateLegalDispute = (
  id: string,
  input: { status?: DisputeStatus; nextHearingDate?: Date | null; outcome?: string }
) => updateLegalDisputeWith(defaultDb, id, input);
export const clearStay = (id: string) => clearStayWith(defaultDb, id);
export const hasActiveStay = (projectId: string) => hasActiveStayWith(defaultDb, projectId);
