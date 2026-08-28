import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import { projects, stageHistory } from "./schema";
import * as schema from "./schema";
import { transitionProject, type Action, type Role, type Stage } from "@/lib/workflow";

type Db = LibSQLDatabase<typeof schema>;

export interface CreateProjectInput {
  name: string;
  purpose: string;
  state: string;
  district: string;
  createdBy: string;
}

export async function createProjectWith(
  database: Db,
  input: CreateProjectInput
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  await database.insert(projects).values({
    id,
    name: input.name,
    purpose: input.purpose,
    state: input.state,
    district: input.district,
    stage: "DRAFT",
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
  await database.insert(stageHistory).values({
    id: crypto.randomUUID(),
    projectId: id,
    fromStage: null,
    toStage: "DRAFT",
    action: "CREATE",
    actorId: input.createdBy,
    actorRole: "agency",
    createdAt: now,
  });
  return id;
}

export async function listProjectsWith(database: Db) {
  return database.select().from(projects);
}

export async function getProjectWith(database: Db, id: string) {
  const rows = await database.select().from(projects).where(eq(projects.id, id));
  return rows[0] ?? null;
}

export async function applyProjectTransitionWith(
  database: Db,
  projectId: string,
  action: Action,
  actorId: string,
  actorRole: Role
): Promise<Stage> {
  const project = await getProjectWith(database, projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  const nextStage = transitionProject(project.stage as Stage, action, actorRole);
  const now = new Date();
  await database
    .update(projects)
    .set({ stage: nextStage, updatedAt: now })
    .where(eq(projects.id, projectId));
  await database.insert(stageHistory).values({
    id: crypto.randomUUID(),
    projectId,
    fromStage: project.stage,
    toStage: nextStage,
    action,
    actorId,
    actorRole,
    createdAt: now,
  });
  return nextStage;
}

export const createProject = (input: CreateProjectInput) =>
  createProjectWith(defaultDb, input);
export const listProjects = () => listProjectsWith(defaultDb);
export const getProject = (id: string) => getProjectWith(defaultDb, id);
export const applyProjectTransition = (
  projectId: string,
  action: Action,
  actorId: string,
  actorRole: Role
) => applyProjectTransitionWith(defaultDb, projectId, action, actorId, actorRole);
