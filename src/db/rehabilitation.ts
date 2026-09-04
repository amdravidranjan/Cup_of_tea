import { desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

export const REHAB_SERVICE_TYPES = [
  "SKILL_TRAINING",
  "JOB_PLACEMENT",
  "HOUSING_ALLOTMENT",
  "TRANSPORT_ASSISTANCE",
  "COUNSELING",
] as const;
export type RehabServiceType = (typeof REHAB_SERVICE_TYPES)[number];

export const REHAB_STATUSES = ["REQUESTED", "SCHEDULED", "COMPLETED", "DECLINED"] as const;
export type RehabStatus = (typeof REHAB_STATUSES)[number];

export interface RehabilitationService {
  id: string;
  familyId: string;
  projectId: string;
  serviceType: RehabServiceType;
  status: RehabStatus;
  notes: string | null;
  scheduledDate: Date | null;
  completedDate: Date | null;
  facilitatedBy: string | null;
  createdAt: Date;
}

function toService(row: typeof schema.rehabilitationServices.$inferSelect): RehabilitationService {
  return {
    id: row.id,
    familyId: row.familyId,
    projectId: row.projectId,
    serviceType: row.serviceType as RehabServiceType,
    status: row.status as RehabStatus,
    notes: row.notes,
    scheduledDate: row.scheduledDate,
    completedDate: row.completedDate,
    facilitatedBy: row.facilitatedBy,
    createdAt: row.createdAt,
  };
}

export interface RequestRehabServiceInput {
  familyId: string;
  projectId: string;
  serviceType: RehabServiceType;
  notes?: string;
}

export async function requestRehabServiceWith(
  database: Db,
  input: RequestRehabServiceInput
): Promise<string> {
  const id = crypto.randomUUID();
  await database.insert(schema.rehabilitationServices).values({
    id,
    familyId: input.familyId,
    projectId: input.projectId,
    serviceType: input.serviceType,
    status: "REQUESTED",
    notes: input.notes ?? null,
    createdAt: new Date(),
  });
  return id;
}

export async function listRehabServicesForProjectWith(
  database: Db,
  projectId: string
): Promise<RehabilitationService[]> {
  const rows = await database
    .select()
    .from(schema.rehabilitationServices)
    .where(eq(schema.rehabilitationServices.projectId, projectId))
    .orderBy(desc(schema.rehabilitationServices.createdAt));
  return rows.map(toService);
}

export async function getRehabServiceByIdWith(
  database: Db,
  id: string
): Promise<RehabilitationService | null> {
  const rows = await database
    .select()
    .from(schema.rehabilitationServices)
    .where(eq(schema.rehabilitationServices.id, id));
  return rows[0] ? toService(rows[0]) : null;
}

export async function updateRehabServiceWith(
  database: Db,
  id: string,
  input: {
    status: RehabStatus;
    scheduledDate?: Date;
    completedDate?: Date;
    facilitatedBy?: string;
  }
): Promise<void> {
  await database
    .update(schema.rehabilitationServices)
    .set({
      status: input.status,
      ...(input.scheduledDate ? { scheduledDate: input.scheduledDate } : {}),
      ...(input.completedDate ? { completedDate: input.completedDate } : {}),
      ...(input.facilitatedBy ? { facilitatedBy: input.facilitatedBy } : {}),
    })
    .where(eq(schema.rehabilitationServices.id, id));
}

export const requestRehabService = (input: RequestRehabServiceInput) =>
  requestRehabServiceWith(defaultDb, input);
export const listRehabServicesForProject = (projectId: string) =>
  listRehabServicesForProjectWith(defaultDb, projectId);
export const getRehabServiceById = (id: string) => getRehabServiceByIdWith(defaultDb, id);
export const updateRehabService = (
  id: string,
  input: { status: RehabStatus; scheduledDate?: Date; completedDate?: Date; facilitatedBy?: string }
) => updateRehabServiceWith(defaultDb, id, input);
