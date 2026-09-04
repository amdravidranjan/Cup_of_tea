import { desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

export const TENDER_STATUSES = ["PUBLISHED", "AWARDED", "IN_PROGRESS", "COMPLETED"] as const;
export type TenderStatus = (typeof TENDER_STATUSES)[number];

export interface Contractor {
  id: string;
  name: string;
  registrationNumber: string;
  specialization: string | null;
  rating: number | null;
  createdAt: Date;
}

export interface Tender {
  id: string;
  projectId: string;
  tenderNumber: string;
  title: string;
  scope: string;
  estimatedValue: number;
  status: TenderStatus;
  publishedDate: Date;
  submissionDeadline: Date | null;
  contractorId: string | null;
  awardedValue: number | null;
  awardedDate: Date | null;
  createdBy: string;
  createdAt: Date;
}

function toContractor(row: typeof schema.contractors.$inferSelect): Contractor {
  return {
    id: row.id,
    name: row.name,
    registrationNumber: row.registrationNumber,
    specialization: row.specialization,
    rating: row.rating,
    createdAt: row.createdAt,
  };
}

function toTender(row: typeof schema.tenders.$inferSelect): Tender {
  return {
    id: row.id,
    projectId: row.projectId,
    tenderNumber: row.tenderNumber,
    title: row.title,
    scope: row.scope,
    estimatedValue: row.estimatedValue,
    status: row.status as TenderStatus,
    publishedDate: row.publishedDate,
    submissionDeadline: row.submissionDeadline,
    contractorId: row.contractorId,
    awardedValue: row.awardedValue,
    awardedDate: row.awardedDate,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

function generateTenderNumber(): string {
  const year = new Date().getFullYear();
  const n = Math.floor(1000 + Math.random() * 9000);
  return `TND-${year}-${n}`;
}

export interface CreateTenderInput {
  projectId: string;
  title: string;
  scope: string;
  estimatedValue: number;
  submissionDeadline?: Date;
  createdBy: string;
}

export async function createTenderWith(database: Db, input: CreateTenderInput): Promise<string> {
  const id = crypto.randomUUID();
  await database.insert(schema.tenders).values({
    id,
    projectId: input.projectId,
    tenderNumber: generateTenderNumber(),
    title: input.title,
    scope: input.scope,
    estimatedValue: input.estimatedValue,
    status: "PUBLISHED",
    publishedDate: new Date(),
    submissionDeadline: input.submissionDeadline ?? null,
    contractorId: null,
    awardedValue: null,
    awardedDate: null,
    createdBy: input.createdBy,
    createdAt: new Date(),
  });
  return id;
}

export async function listTendersForProjectWith(database: Db, projectId: string): Promise<Tender[]> {
  const rows = await database
    .select()
    .from(schema.tenders)
    .where(eq(schema.tenders.projectId, projectId))
    .orderBy(desc(schema.tenders.publishedDate));
  return rows.map(toTender);
}

export async function getTenderByIdWith(database: Db, id: string): Promise<Tender | null> {
  const rows = await database.select().from(schema.tenders).where(eq(schema.tenders.id, id));
  return rows[0] ? toTender(rows[0]) : null;
}

export async function awardTenderWith(
  database: Db,
  id: string,
  input: { contractorId: string; awardedValue: number }
): Promise<void> {
  await database
    .update(schema.tenders)
    .set({
      status: "AWARDED",
      contractorId: input.contractorId,
      awardedValue: input.awardedValue,
      awardedDate: new Date(),
    })
    .where(eq(schema.tenders.id, id));
}

export async function advanceTenderStatusWith(
  database: Db,
  id: string,
  status: TenderStatus
): Promise<void> {
  await database.update(schema.tenders).set({ status }).where(eq(schema.tenders.id, id));
}

export async function listContractorsWith(database: Db): Promise<Contractor[]> {
  const rows = await database.select().from(schema.contractors).orderBy(schema.contractors.name);
  return rows.map(toContractor);
}

export async function getContractorByIdWith(database: Db, id: string): Promise<Contractor | null> {
  const rows = await database.select().from(schema.contractors).where(eq(schema.contractors.id, id));
  return rows[0] ? toContractor(rows[0]) : null;
}

/** Every tender (across every project) this contractor has ever won —
 * this is the "see their past projects" view. */
export async function listTendersForContractorWith(database: Db, contractorId: string): Promise<Tender[]> {
  const rows = await database
    .select()
    .from(schema.tenders)
    .where(eq(schema.tenders.contractorId, contractorId))
    .orderBy(desc(schema.tenders.awardedDate));
  return rows.map(toTender);
}

export interface CreateContractorInput {
  name: string;
  registrationNumber: string;
  specialization?: string;
  rating?: number;
}

export async function createContractorWith(
  database: Db,
  input: CreateContractorInput
): Promise<string> {
  const id = crypto.randomUUID();
  await database.insert(schema.contractors).values({
    id,
    name: input.name,
    registrationNumber: input.registrationNumber,
    specialization: input.specialization ?? null,
    rating: input.rating ?? null,
    createdAt: new Date(),
  });
  return id;
}

export const createTender = (input: CreateTenderInput) => createTenderWith(defaultDb, input);
export const listTendersForProject = (projectId: string) =>
  listTendersForProjectWith(defaultDb, projectId);
export const getTenderById = (id: string) => getTenderByIdWith(defaultDb, id);
export const awardTender = (id: string, input: { contractorId: string; awardedValue: number }) =>
  awardTenderWith(defaultDb, id, input);
export const advanceTenderStatus = (id: string, status: TenderStatus) =>
  advanceTenderStatusWith(defaultDb, id, status);
export const listContractors = () => listContractorsWith(defaultDb);
export const getContractorById = (id: string) => getContractorByIdWith(defaultDb, id);
export const listTendersForContractor = (contractorId: string) =>
  listTendersForContractorWith(defaultDb, contractorId);
export const createContractor = (input: CreateContractorInput) =>
  createContractorWith(defaultDb, input);
