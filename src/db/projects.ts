import { eq, asc } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import { projects, stageHistory } from "./schema";
import * as schema from "./schema";
import { transitionProject, type Action, type Role, type Stage } from "@/lib/workflow";
import type { Geometry } from "@/lib/geo";

type Db = LibSQLDatabase<typeof schema>;

export interface CreateProjectInput {
  name: string;
  purpose: string;
  state: string;
  district: string;
  createdBy: string;
  createdByRole: Role;
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
    actorRole: input.createdByRole,
    createdAt: now,
  });
  return id;
}

/** Prefix of the per-visitor sandbox copies the demo walkthrough creates. */
export const DEMO_SANDBOX_PREFIX = "p-demo-";
export const DEMO_SANDBOX_COOKIE = "nilams_demo_project";

/**
 * The sandbox belonging to this visitor, if any. Read from the request cookie;
 * outside a request (tests, seed scripts) there is no visitor, so none.
 */
async function currentSandboxId(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    return (await cookies()).get(DEMO_SANDBOX_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function listProjectsWith(database: Db) {
  const all = await database.select().from(projects);
  // Every judge who starts the walkthrough gets a private copy of the flagship
  // project. Show a visitor their own copy and nobody else's, or the dashboard
  // fills up with other people's rehearsals.
  if (!all.some((p) => p.id.startsWith(DEMO_SANDBOX_PREFIX))) return all;
  const mine = await currentSandboxId();
  return all.filter((p) => !p.id.startsWith(DEMO_SANDBOX_PREFIX) || p.id === mine);
}

export async function getProjectWith(database: Db, id: string) {
  const rows = await database.select().from(projects).where(eq(projects.id, id));
  if (rows[0]) return rows[0];
  if (id.startsWith(DEMO_SANDBOX_PREFIX)) return reseedSandbox(database, id);
  return null;
}

/**
 * Re-creates a walkthrough sandbox that this instance has never seen.
 *
 * The hosted demo keeps its database in the instance's temp directory, so a
 * request served by a second instance finds no trace of a sandbox the first
 * one created. Rather than show a judge a 404 halfway through the tour, the
 * sandbox is seeded again under the same id and in the same region — the tour
 * carries on, though anything already uploaded on the other instance is gone.
 * Pointing `DATABASE_URL` at a hosted database removes the whole situation.
 */
async function reseedSandbox(database: Db, id: string) {
  try {
    const [{ seedFlagship }, { regionById, DEMO_REGION_COOKIE }, { cookies }] = await Promise.all([
      import("./seed-flagship"),
      import("@/lib/demo/regions"),
      import("next/headers"),
    ]);
    const regionId = (await cookies()).get(DEMO_REGION_COOKIE)?.value;
    await seedFlagship({ id, quiet: true, region: regionById(regionId) });
    const rows = await database.select().from(projects).where(eq(projects.id, id));
    return rows[0] ?? null;
  } catch {
    // Outside a request (tests, scripts) there is no cookie and no sandbox to
    // rebuild; the caller gets the same "not found" it would have got.
    return null;
  }
}

export async function getStageHistoryWith(database: Db, projectId: string) {
  return database
    .select()
    .from(stageHistory)
    .where(eq(stageHistory.projectId, projectId))
    .orderBy(asc(stageHistory.createdAt));
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
  if (action === "COMPLETE_RR" && project.rrStage !== "RR_AWARDED") {
    throw new Error(
      `R&R Award workflow is not complete yet (current R&R stage: ${
        project.rrStage ?? "not started"
      })`
    );
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

export async function setProjectGeometryWith(
  database: Db,
  projectId: string,
  geometry: Geometry
): Promise<void> {
  await database
    .update(projects)
    .set({
      geometryType: geometry.type,
      geometryGeoJson: JSON.stringify(geometry.coordinates),
    })
    .where(eq(projects.id, projectId));
}

export const createProject = (input: CreateProjectInput) =>
  createProjectWith(defaultDb, input);
export const listProjects = () => listProjectsWith(defaultDb);
export const getProject = (id: string) => getProjectWith(defaultDb, id);
export const getStageHistory = (projectId: string) =>
  getStageHistoryWith(defaultDb, projectId);
export const setProjectGeometry = (projectId: string, geometry: Geometry) =>
  setProjectGeometryWith(defaultDb, projectId, geometry);
export const applyProjectTransition = (
  projectId: string,
  action: Action,
  actorId: string,
  actorRole: Role
) => applyProjectTransitionWith(defaultDb, projectId, action, actorId, actorRole);
