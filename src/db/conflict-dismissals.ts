import { eq } from "drizzle-orm";
import { db } from "./client";
import * as schema from "./schema";

export async function listDismissedConflictKeys(): Promise<Set<string>> {
  const rows = await db.select().from(schema.conflictDismissals);
  return new Set(rows.map((r) => r.conflictKey));
}

export async function dismissConflict(input: {
  conflictKey: string;
  dismissedBy: string;
  note?: string;
}): Promise<void> {
  await db
    .insert(schema.conflictDismissals)
    .values({
      id: crypto.randomUUID(),
      conflictKey: input.conflictKey,
      dismissedBy: input.dismissedBy,
      note: input.note ?? null,
      dismissedAt: new Date(),
    })
    .onConflictDoNothing();
}

export async function undismissConflict(conflictKey: string): Promise<void> {
  await db.delete(schema.conflictDismissals).where(eq(schema.conflictDismissals.conflictKey, conflictKey));
}
