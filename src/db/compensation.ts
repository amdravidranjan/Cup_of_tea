import { and, desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import { compensationRates, compensations } from "./schema";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

export interface SetCompensationRateInput {
  state: string;
  district: string;
  ratePerHectare: number;
  multiplier: number;
  setBy: string;
}

export async function setCompensationRateWith(
  database: Db,
  input: SetCompensationRateInput
): Promise<string> {
  const id = crypto.randomUUID();
  await database.insert(compensationRates).values({
    id,
    state: input.state,
    district: input.district,
    ratePerHectare: input.ratePerHectare,
    multiplier: input.multiplier,
    setBy: input.setBy,
    createdAt: new Date(),
  });
  return id;
}

export async function getCurrentCompensationRateWith(
  database: Db,
  state: string,
  district: string
) {
  const rows = await database
    .select()
    .from(compensationRates)
    .where(and(eq(compensationRates.state, state), eq(compensationRates.district, district)))
    .orderBy(desc(compensationRates.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function listCompensationRatesWith(
  database: Db,
  state: string,
  district: string
) {
  return database
    .select()
    .from(compensationRates)
    .where(and(eq(compensationRates.state, state), eq(compensationRates.district, district)))
    .orderBy(desc(compensationRates.createdAt));
}

export interface CreateCompensationInput {
  parcelId: string;
  projectId: string;
  ratePerHectare: number;
  multiplier: number;
  assetsValue: number;
  marketValue: number;
  multipliedMarketValue: number;
  solatium: number;
  interest: number;
  total: number;
  assessedBy: string;
}

export async function createCompensationWith(
  database: Db,
  input: CreateCompensationInput
): Promise<string> {
  const id = crypto.randomUUID();
  await database.insert(compensations).values({
    id,
    parcelId: input.parcelId,
    projectId: input.projectId,
    ratePerHectare: input.ratePerHectare,
    multiplier: input.multiplier,
    assetsValue: input.assetsValue,
    marketValue: input.marketValue,
    multipliedMarketValue: input.multipliedMarketValue,
    solatium: input.solatium,
    interest: input.interest,
    total: input.total,
    status: "ASSESSED",
    assessedBy: input.assessedBy,
    assessedAt: new Date(),
    paidAt: null,
  });
  return id;
}

export async function listCompensationsForProjectWith(database: Db, projectId: string) {
  return database.select().from(compensations).where(eq(compensations.projectId, projectId));
}

export async function getCompensationByIdWith(database: Db, id: string) {
  const rows = await database.select().from(compensations).where(eq(compensations.id, id));
  return rows[0] ?? null;
}

export async function markCompensationPaidWith(database: Db, id: string): Promise<void> {
  await database
    .update(compensations)
    .set({ status: "PAID", paidAt: new Date() })
    .where(eq(compensations.id, id));
}

export const setCompensationRate = (input: SetCompensationRateInput) =>
  setCompensationRateWith(defaultDb, input);
export const getCurrentCompensationRate = (state: string, district: string) =>
  getCurrentCompensationRateWith(defaultDb, state, district);
export const listCompensationRates = (state: string, district: string) =>
  listCompensationRatesWith(defaultDb, state, district);
export const createCompensation = (input: CreateCompensationInput) =>
  createCompensationWith(defaultDb, input);
export const listCompensationsForProject = (projectId: string) =>
  listCompensationsForProjectWith(defaultDb, projectId);
export const markCompensationPaid = (id: string) => markCompensationPaidWith(defaultDb, id);
export const getCompensationById = (id: string) => getCompensationByIdWith(defaultDb, id);
