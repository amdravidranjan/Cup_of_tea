import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

export interface Heir {
  id: string;
  familyId: string;
  name: string;
  relationship: string;
  sharePercent: number;
  contactPhone: string | null;
  createdAt: Date;
}

function toHeir(row: typeof schema.heirs.$inferSelect): Heir {
  return {
    id: row.id,
    familyId: row.familyId,
    name: row.name,
    relationship: row.relationship,
    sharePercent: row.sharePercent,
    contactPhone: row.contactPhone,
    createdAt: row.createdAt,
  };
}

export interface RecordSuccessionInput {
  familyId: string;
  deceasedAt: Date;
  successionNote?: string;
  heirs: { name: string; relationship: string; sharePercent: number; contactPhone?: string }[];
}

/** Marks a family's head of household as deceased and splits their
 * entitlement across the given heirs (shares should sum to ~100, but
 * that's a UI-level nudge, not enforced here — real successions are
 * sometimes still being sorted out when this gets recorded). */
export async function recordSuccessionWith(
  database: Db,
  input: RecordSuccessionInput
): Promise<void> {
  const now = new Date();
  await database
    .update(schema.families)
    .set({ deceasedAt: input.deceasedAt, successionNote: input.successionNote ?? null })
    .where(eq(schema.families.id, input.familyId));

  if (input.heirs.length > 0) {
    await database.insert(schema.heirs).values(
      input.heirs.map((h) => ({
        id: crypto.randomUUID(),
        familyId: input.familyId,
        name: h.name,
        relationship: h.relationship,
        sharePercent: h.sharePercent,
        contactPhone: h.contactPhone ?? null,
        createdAt: now,
      }))
    );
  }
}

export async function listHeirsForFamilyWith(database: Db, familyId: string): Promise<Heir[]> {
  const rows = await database.select().from(schema.heirs).where(eq(schema.heirs.familyId, familyId));
  return rows.map(toHeir);
}

export const recordSuccession = (input: RecordSuccessionInput) =>
  recordSuccessionWith(defaultDb, input);
export const listHeirsForFamily = (familyId: string) => listHeirsForFamilyWith(defaultDb, familyId);
