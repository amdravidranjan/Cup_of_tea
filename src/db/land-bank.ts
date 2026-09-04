import { desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

export const LAND_BANK_STATUSES = ["IDLE", "UNDER_REVIEW", "REPURPOSED", "DISPOSED"] as const;
export type LandBankStatus = (typeof LAND_BANK_STATUSES)[number];

export interface LandBankEntry {
  id: string;
  parcelId: string;
  projectId: string;
  status: LandBankStatus;
  reason: string;
  note: string | null;
  flaggedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

function toEntry(row: typeof schema.landBankEntries.$inferSelect): LandBankEntry {
  return {
    id: row.id,
    parcelId: row.parcelId,
    projectId: row.projectId,
    status: row.status as LandBankStatus,
    reason: row.reason,
    note: row.note,
    flaggedBy: row.flaggedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface FlagLandBankInput {
  parcelId: string;
  projectId: string;
  reason: string;
  note?: string;
  flaggedBy: string;
}

export async function flagLandBankEntryWith(
  database: Db,
  input: FlagLandBankInput
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  await database.insert(schema.landBankEntries).values({
    id,
    parcelId: input.parcelId,
    projectId: input.projectId,
    status: "IDLE",
    reason: input.reason,
    note: input.note ?? null,
    flaggedBy: input.flaggedBy,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function listLandBankForProjectWith(
  database: Db,
  projectId: string
): Promise<LandBankEntry[]> {
  const rows = await database
    .select()
    .from(schema.landBankEntries)
    .where(eq(schema.landBankEntries.projectId, projectId))
    .orderBy(desc(schema.landBankEntries.createdAt));
  return rows.map(toEntry);
}

export async function listAllLandBankWith(database: Db): Promise<LandBankEntry[]> {
  const rows = await database
    .select()
    .from(schema.landBankEntries)
    .orderBy(desc(schema.landBankEntries.createdAt));
  return rows.map(toEntry);
}

export async function updateLandBankStatusWith(
  database: Db,
  id: string,
  status: LandBankStatus
): Promise<void> {
  await database
    .update(schema.landBankEntries)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.landBankEntries.id, id));
}

export async function getLandBankEntryByIdWith(
  database: Db,
  id: string
): Promise<LandBankEntry | null> {
  const rows = await database
    .select()
    .from(schema.landBankEntries)
    .where(eq(schema.landBankEntries.id, id));
  return rows[0] ? toEntry(rows[0]) : null;
}

export const flagLandBankEntry = (input: FlagLandBankInput) =>
  flagLandBankEntryWith(defaultDb, input);
export const listLandBankForProject = (projectId: string) =>
  listLandBankForProjectWith(defaultDb, projectId);
export const listAllLandBank = () => listAllLandBankWith(defaultDb);
export const updateLandBankStatus = (id: string, status: LandBankStatus) =>
  updateLandBankStatusWith(defaultDb, id, status);
export const getLandBankEntryById = (id: string) => getLandBankEntryByIdWith(defaultDb, id);
