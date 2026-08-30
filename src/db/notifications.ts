import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";
import { listProjectsWith } from "./projects";
import { scopeProjects, type ProjectScopeFilter } from "@/lib/project-scope";

type Db = LibSQLDatabase<typeof schema>;

export interface NotificationEvent {
  id: string;
  projectId: string;
  projectName: string;
  state: string;
  district: string;
  kind: "stage" | "rr";
  fromStage: string | null;
  toStage: string;
  action: string;
  actorRole: string;
  createdAt: Date;
}

export async function listNotificationsWith(
  database: Db,
  filter?: ProjectScopeFilter,
  limit = 30
): Promise<NotificationEvent[]> {
  const projects = scopeProjects(await listProjectsWith(database), filter);
  const byId = new Map(projects.map((p) => [p.id, p]));

  const events: NotificationEvent[] = [];
  for (const project of projects) {
    const [stageRows, rrRows] = await Promise.all([
      database.select().from(schema.stageHistory).where(eq(schema.stageHistory.projectId, project.id)),
      database
        .select()
        .from(schema.rrStageHistory)
        .where(eq(schema.rrStageHistory.projectId, project.id)),
    ]);
    for (const row of stageRows) {
      const p = byId.get(row.projectId)!;
      events.push({
        id: row.id,
        projectId: p.id,
        projectName: p.name,
        state: p.state,
        district: p.district,
        kind: "stage",
        fromStage: row.fromStage,
        toStage: row.toStage,
        action: row.action,
        actorRole: row.actorRole,
        createdAt: row.createdAt,
      });
    }
    for (const row of rrRows) {
      const p = byId.get(row.projectId)!;
      events.push({
        id: row.id,
        projectId: p.id,
        projectName: p.name,
        state: p.state,
        district: p.district,
        kind: "rr",
        fromStage: row.fromStage,
        toStage: row.toStage,
        action: row.action,
        actorRole: row.actorRole,
        createdAt: row.createdAt,
      });
    }
  }

  return events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}

export async function getLastSeenWith(database: Db, userId: string): Promise<Date | null> {
  const rows = await database
    .select()
    .from(schema.notificationReads)
    .where(eq(schema.notificationReads.userId, userId));
  return rows[0]?.lastSeenAt ?? null;
}

export async function markSeenWith(
  database: Db,
  userId: string,
  at: Date = new Date()
): Promise<void> {
  await database
    .insert(schema.notificationReads)
    .values({ userId, lastSeenAt: at })
    .onConflictDoUpdate({ target: schema.notificationReads.userId, set: { lastSeenAt: at } });
}

export const listNotifications = (filter?: ProjectScopeFilter, limit?: number) =>
  listNotificationsWith(defaultDb, filter, limit);
export const getLastSeen = (userId: string) => getLastSeenWith(defaultDb, userId);
export const markSeen = (userId: string, at?: Date) => markSeenWith(defaultDb, userId, at);
