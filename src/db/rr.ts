import { eq, asc } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import { projects, rrStageHistory } from "./schema";
import * as schema from "./schema";
import { transitionRR, type RRAction, type RRStage } from "@/lib/rr-workflow";
import type { Role } from "@/lib/workflow";

type Db = LibSQLDatabase<typeof schema>;

export async function getRRStageWith(
  database: Db,
  projectId: string
): Promise<RRStage | null> {
  const rows = await database.select().from(projects).where(eq(projects.id, projectId));
  return (rows[0]?.rrStage as RRStage | null) ?? null;
}

export async function getRRHistoryWith(database: Db, projectId: string) {
  return database
    .select()
    .from(rrStageHistory)
    .where(eq(rrStageHistory.projectId, projectId))
    .orderBy(asc(rrStageHistory.createdAt));
}

export async function applyRRTransitionWith(
  database: Db,
  projectId: string,
  action: RRAction,
  actorId: string,
  actorRole: Role,
  note?: string
): Promise<RRStage> {
  const rows = await database.select().from(projects).where(eq(projects.id, projectId));
  const project = rows[0];
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  const currentStage = (project.rrStage as RRStage | null) ?? null;
  const nextStage = transitionRR(currentStage, action, actorRole);
  const now = new Date();
  await database
    .update(projects)
    .set({ rrStage: nextStage })
    .where(eq(projects.id, projectId));
  await database.insert(rrStageHistory).values({
    id: crypto.randomUUID(),
    projectId,
    fromStage: currentStage,
    toStage: nextStage,
    action,
    actorId,
    actorRole,
    note: note ?? null,
    createdAt: now,
  });
  return nextStage;
}

export const getRRStage = (projectId: string) => getRRStageWith(defaultDb, projectId);
export const getRRHistory = (projectId: string) => getRRHistoryWith(defaultDb, projectId);
export const applyRRTransition = (
  projectId: string,
  action: RRAction,
  actorId: string,
  actorRole: Role,
  note?: string
) => applyRRTransitionWith(defaultDb, projectId, action, actorId, actorRole, note);
