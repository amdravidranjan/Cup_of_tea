import { desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

export type ProjectRequestStatus = "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export interface ProjectRequest {
  id: string;
  trackingNumber: string;
  title: string;
  purpose: string;
  description: string;
  state: string;
  district: string;
  village: string | null;
  requesterName: string;
  requesterContact: string | null;
  status: ProjectRequestStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  linkedProjectId: string | null;
  createdAt: Date;
}

const TRACKING_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateRequestTrackingNumber(): string {
  const year = new Date().getFullYear();
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += TRACKING_CHARS[Math.floor(Math.random() * TRACKING_CHARS.length)];
  }
  return `REQ-${year}-${code}`;
}

function toRequest(row: typeof schema.projectRequests.$inferSelect): ProjectRequest {
  return {
    id: row.id,
    trackingNumber: row.id,
    title: row.title,
    purpose: row.purpose,
    description: row.description,
    state: row.state,
    district: row.district,
    village: row.village,
    requesterName: row.requesterName,
    requesterContact: row.requesterContact,
    status: row.status as ProjectRequestStatus,
    reviewNote: row.reviewNote,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    linkedProjectId: row.linkedProjectId,
    createdAt: row.createdAt,
  };
}

export interface CreateProjectRequestInput {
  title: string;
  purpose: string;
  description: string;
  state: string;
  district: string;
  village?: string;
  requesterName: string;
  requesterContact?: string;
}

export async function createProjectRequestWith(
  database: Db,
  input: CreateProjectRequestInput
): Promise<string> {
  const id = generateRequestTrackingNumber();
  await database.insert(schema.projectRequests).values({
    id,
    title: input.title,
    purpose: input.purpose,
    description: input.description,
    state: input.state,
    district: input.district,
    village: input.village ?? null,
    requesterName: input.requesterName,
    requesterContact: input.requesterContact ?? null,
    status: "SUBMITTED",
    createdAt: new Date(),
  });
  return id;
}

export async function listProjectRequestsWith(
  database: Db,
  filter?: { state?: string; district?: string }
): Promise<ProjectRequest[]> {
  const rows = await database
    .select()
    .from(schema.projectRequests)
    .orderBy(desc(schema.projectRequests.createdAt));
  return rows
    .map(toRequest)
    .filter((r) => !filter?.state || r.state === filter.state)
    .filter((r) => !filter?.district || r.district === filter.district);
}

export async function getProjectRequestByIdWith(
  database: Db,
  id: string
): Promise<ProjectRequest | null> {
  const rows = await database
    .select()
    .from(schema.projectRequests)
    .where(eq(schema.projectRequests.id, id));
  return rows[0] ? toRequest(rows[0]) : null;
}

export async function reviewProjectRequestWith(
  database: Db,
  id: string,
  input: {
    status: "UNDER_REVIEW" | "APPROVED" | "REJECTED";
    reviewNote?: string;
    reviewedBy: string;
    linkedProjectId?: string;
  }
): Promise<void> {
  await database
    .update(schema.projectRequests)
    .set({
      status: input.status,
      reviewNote: input.reviewNote ?? null,
      reviewedBy: input.reviewedBy,
      reviewedAt: new Date(),
      linkedProjectId: input.linkedProjectId ?? null,
    })
    .where(eq(schema.projectRequests.id, id));
}

export const createProjectRequest = (input: CreateProjectRequestInput) =>
  createProjectRequestWith(defaultDb, input);
export const listProjectRequests = (filter?: { state?: string; district?: string }) =>
  listProjectRequestsWith(defaultDb, filter);
export const getProjectRequestById = (id: string) => getProjectRequestByIdWith(defaultDb, id);
export const reviewProjectRequest = (
  id: string,
  input: {
    status: "UNDER_REVIEW" | "APPROVED" | "REJECTED";
    reviewNote?: string;
    reviewedBy: string;
    linkedProjectId?: string;
  }
) => reviewProjectRequestWith(defaultDb, id, input);
