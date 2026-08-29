import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";
import { INFRASTRUCTURE_ITEMS, type InfrastructureItem } from "@/lib/infrastructure";

type Db = LibSQLDatabase<typeof schema>;

export interface InfrastructureChecklistItem {
  id: string;
  projectId: string;
  item: InfrastructureItem;
  status: "PENDING" | "COMPLETE";
  completedBy: string | null;
  completedAt: Date | null;
}

export async function ensureInfrastructureChecklistWith(
  database: Db,
  projectId: string
): Promise<void> {
  const existing = await database
    .select()
    .from(schema.infrastructureItems)
    .where(eq(schema.infrastructureItems.projectId, projectId));
  if (existing.length > 0) return;

  await database.insert(schema.infrastructureItems).values(
    INFRASTRUCTURE_ITEMS.map((item) => ({
      id: crypto.randomUUID(),
      projectId,
      item,
      status: "PENDING" as const,
    }))
  );
}

export async function listInfrastructureChecklistWith(
  database: Db,
  projectId: string
): Promise<InfrastructureChecklistItem[]> {
  const rows = await database
    .select()
    .from(schema.infrastructureItems)
    .where(eq(schema.infrastructureItems.projectId, projectId));
  return rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    item: r.item as InfrastructureItem,
    status: r.status as "PENDING" | "COMPLETE",
    completedBy: r.completedBy,
    completedAt: r.completedAt,
  }));
}

export async function completeInfrastructureItemWith(
  database: Db,
  id: string,
  actorId: string
): Promise<void> {
  const rows = await database
    .select()
    .from(schema.infrastructureItems)
    .where(eq(schema.infrastructureItems.id, id));
  const row = rows[0];
  if (!row) {
    throw new Error(`Infrastructure item not found: ${id}`);
  }
  if (row.status === "COMPLETE") {
    throw new Error(`Infrastructure item already complete: ${id}`);
  }
  await database
    .update(schema.infrastructureItems)
    .set({ status: "COMPLETE", completedBy: actorId, completedAt: new Date() })
    .where(eq(schema.infrastructureItems.id, id));
}

export const ensureInfrastructureChecklist = (projectId: string) =>
  ensureInfrastructureChecklistWith(defaultDb, projectId);
export const listInfrastructureChecklist = (projectId: string) =>
  listInfrastructureChecklistWith(defaultDb, projectId);
export const completeInfrastructureItem = (id: string, actorId: string) =>
  completeInfrastructureItemWith(defaultDb, id, actorId);
