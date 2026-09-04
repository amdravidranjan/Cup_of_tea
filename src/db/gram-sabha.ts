import { desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

export interface GramSabhaConsultation {
  id: string;
  projectId: string;
  village: string;
  consultationDate: Date;
  attendanceCount: number;
  minutes: string;
  resolution: string;
  recordedBy: string;
  createdAt: Date;
}

function toConsultation(
  row: typeof schema.gramSabhaConsultations.$inferSelect
): GramSabhaConsultation {
  return {
    id: row.id,
    projectId: row.projectId,
    village: row.village,
    consultationDate: row.consultationDate,
    attendanceCount: row.attendanceCount,
    minutes: row.minutes,
    resolution: row.resolution,
    recordedBy: row.recordedBy,
    createdAt: row.createdAt,
  };
}

export interface RecordConsultationInput {
  projectId: string;
  village: string;
  consultationDate: Date;
  attendanceCount: number;
  minutes: string;
  resolution: string;
  recordedBy: string;
}

export async function recordConsultationWith(
  database: Db,
  input: RecordConsultationInput
): Promise<string> {
  const id = crypto.randomUUID();
  await database.insert(schema.gramSabhaConsultations).values({
    id,
    projectId: input.projectId,
    village: input.village,
    consultationDate: input.consultationDate,
    attendanceCount: input.attendanceCount,
    minutes: input.minutes,
    resolution: input.resolution,
    recordedBy: input.recordedBy,
    createdAt: new Date(),
  });
  return id;
}

export async function listConsultationsForProjectWith(
  database: Db,
  projectId: string
): Promise<GramSabhaConsultation[]> {
  const rows = await database
    .select()
    .from(schema.gramSabhaConsultations)
    .where(eq(schema.gramSabhaConsultations.projectId, projectId))
    .orderBy(desc(schema.gramSabhaConsultations.consultationDate));
  return rows.map(toConsultation);
}

export const recordConsultation = (input: RecordConsultationInput) =>
  recordConsultationWith(defaultDb, input);
export const listConsultationsForProject = (projectId: string) =>
  listConsultationsForProjectWith(defaultDb, projectId);
