import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";
import { listProjectsWith } from "./projects";
import {
  transitionGrievance,
  generateTrackingNumber,
  type GrievanceAction,
  type GrievanceResolution,
  type GrievanceStatus,
  type GrievanceType,
} from "@/lib/grievance-workflow";
import type { Role } from "@/lib/workflow";

type Db = LibSQLDatabase<typeof schema>;

export interface CreateGrievanceInput {
  type: GrievanceType;
  projectId: string;
  compensationId?: string;
  submitterName: string;
  submitterContact?: string;
  description: string;
  attachmentFileName?: string;
  attachmentStoragePath?: string;
}

export interface Grievance {
  id: string;
  trackingNumber: string;
  type: GrievanceType;
  projectId: string;
  compensationId: string | null;
  submitterName: string;
  submitterContact: string | null;
  description: string;
  attachmentFileName: string | null;
  attachmentStoragePath: string | null;
  status: GrievanceStatus;
  resolution: GrievanceResolution | null;
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface GrievanceWithProject extends Grievance {
  projectName: string;
  state: string;
  district: string;
}

function toGrievance(row: typeof schema.grievances.$inferSelect): Grievance {
  return {
    id: row.id,
    trackingNumber: row.trackingNumber,
    type: row.type as GrievanceType,
    projectId: row.projectId,
    compensationId: row.compensationId,
    submitterName: row.submitterName,
    submitterContact: row.submitterContact,
    description: row.description,
    attachmentFileName: row.attachmentFileName,
    attachmentStoragePath: row.attachmentStoragePath,
    status: row.status as GrievanceStatus,
    resolution: row.resolution as GrievanceResolution | null,
    resolutionNote: row.resolutionNote,
    resolvedBy: row.resolvedBy,
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
  };
}

export async function createGrievanceWith(
  database: Db,
  input: CreateGrievanceInput
): Promise<string> {
  const trackingNumber = generateTrackingNumber();
  await database.insert(schema.grievances).values({
    id: crypto.randomUUID(),
    trackingNumber,
    type: input.type,
    projectId: input.projectId,
    compensationId: input.compensationId ?? null,
    submitterName: input.submitterName,
    submitterContact: input.submitterContact ?? null,
    description: input.description,
    attachmentFileName: input.attachmentFileName ?? null,
    attachmentStoragePath: input.attachmentStoragePath ?? null,
    status: "FILED",
    createdAt: new Date(),
  });
  return trackingNumber;
}

export async function getGrievanceByTrackingNumberWith(
  database: Db,
  trackingNumber: string
): Promise<Grievance | null> {
  const rows = await database
    .select()
    .from(schema.grievances)
    .where(eq(schema.grievances.trackingNumber, trackingNumber));
  return rows[0] ? toGrievance(rows[0]) : null;
}

export async function listGrievancesWith(
  database: Db,
  filter?: { state?: string }
): Promise<GrievanceWithProject[]> {
  const [grievanceRows, projectRows] = await Promise.all([
    database.select().from(schema.grievances),
    listProjectsWith(database),
  ]);
  const projectsById = new Map(projectRows.map((p) => [p.id, p]));

  return grievanceRows
    .map((row) => {
      const project = projectsById.get(row.projectId);
      return {
        ...toGrievance(row),
        projectName: project?.name ?? "Unknown project",
        state: project?.state ?? "",
        district: project?.district ?? "",
      };
    })
    .filter((g) => !filter?.state || g.state === filter.state)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function transitionGrievanceStatusWith(
  database: Db,
  id: string,
  action: GrievanceAction,
  actorRole: Role,
  actorId: string,
  resolution?: { resolution: GrievanceResolution; resolutionNote?: string }
): Promise<GrievanceStatus> {
  const rows = await database.select().from(schema.grievances).where(eq(schema.grievances.id, id));
  const row = rows[0];
  if (!row) {
    throw new Error(`Grievance not found: ${id}`);
  }
  const nextStatus = transitionGrievance(row.status as GrievanceStatus, action, actorRole);

  await database
    .update(schema.grievances)
    .set(
      nextStatus === "RESOLVED"
        ? {
            status: nextStatus,
            resolution: resolution?.resolution ?? null,
            resolutionNote: resolution?.resolutionNote ?? null,
            resolvedBy: actorId,
            resolvedAt: new Date(),
          }
        : { status: nextStatus }
    )
    .where(eq(schema.grievances.id, id));

  return nextStatus;
}

export const createGrievance = (input: CreateGrievanceInput) =>
  createGrievanceWith(defaultDb, input);
export const getGrievanceByTrackingNumber = (trackingNumber: string) =>
  getGrievanceByTrackingNumberWith(defaultDb, trackingNumber);
export const listGrievances = (filter?: { state?: string }) =>
  listGrievancesWith(defaultDb, filter);
export const transitionGrievanceStatus = (
  id: string,
  action: GrievanceAction,
  actorRole: Role,
  actorId: string,
  resolution?: { resolution: GrievanceResolution; resolutionNote?: string }
) => transitionGrievanceStatusWith(defaultDb, id, action, actorRole, actorId, resolution);
