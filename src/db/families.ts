import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";
import { ENTITLEMENT_TYPES, type EntitlementType } from "@/lib/entitlements";

type Db = LibSQLDatabase<typeof schema>;

export interface CreateFamilyInput {
  projectId: string;
  parcelId?: string;
  headOfHouseholdName: string;
  village: string;
  category: string;
  memberCount: number;
  vulnerableGroup: boolean;
  contactPhone?: string;
  surveyedBy: string;
}

export interface FamilyEntitlement {
  id: string;
  type: EntitlementType;
  status: "PENDING" | "GRANTED";
  amount: number | null;
  grantedBy: string | null;
  grantedAt: Date | null;
  note: string | null;
}

export interface FamilyWithEntitlements {
  id: string;
  projectId: string;
  parcelId: string | null;
  headOfHouseholdName: string;
  village: string;
  category: string;
  memberCount: number;
  vulnerableGroup: boolean;
  contactPhone: string | null;
  surveyedBy: string;
  surveyedAt: Date;
  entitlements: FamilyEntitlement[];
}

export async function createFamilyWith(database: Db, input: CreateFamilyInput): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  await database.insert(schema.families).values({
    id,
    projectId: input.projectId,
    parcelId: input.parcelId ?? null,
    headOfHouseholdName: input.headOfHouseholdName,
    village: input.village,
    category: input.category,
    memberCount: input.memberCount,
    vulnerableGroup: input.vulnerableGroup,
    contactPhone: input.contactPhone ?? null,
    surveyedBy: input.surveyedBy,
    surveyedAt: now,
  });
  await database.insert(schema.entitlements).values(
    ENTITLEMENT_TYPES.map((type) => ({
      id: crypto.randomUUID(),
      familyId: id,
      type,
      status: "PENDING" as const,
    }))
  );
  return id;
}

export async function listFamiliesForProjectWith(
  database: Db,
  projectId: string
): Promise<FamilyWithEntitlements[]> {
  const familyRows = await database
    .select()
    .from(schema.families)
    .where(eq(schema.families.projectId, projectId));

  return Promise.all(
    familyRows.map(async (f) => {
      const entitlementRows = await database
        .select()
        .from(schema.entitlements)
        .where(eq(schema.entitlements.familyId, f.id));
      return {
        id: f.id,
        projectId: f.projectId,
        parcelId: f.parcelId,
        headOfHouseholdName: f.headOfHouseholdName,
        village: f.village,
        category: f.category,
        memberCount: f.memberCount,
        vulnerableGroup: f.vulnerableGroup,
        contactPhone: f.contactPhone,
        surveyedBy: f.surveyedBy,
        surveyedAt: f.surveyedAt,
        entitlements: entitlementRows.map((e) => ({
          id: e.id,
          type: e.type as EntitlementType,
          status: e.status as "PENDING" | "GRANTED",
          amount: e.amount,
          grantedBy: e.grantedBy,
          grantedAt: e.grantedAt,
          note: e.note,
        })),
      };
    })
  );
}

export async function grantEntitlementWith(
  database: Db,
  entitlementId: string,
  input: { amount: number; grantedBy: string; note?: string }
): Promise<void> {
  const rows = await database
    .select()
    .from(schema.entitlements)
    .where(eq(schema.entitlements.id, entitlementId));
  const entitlement = rows[0];
  if (!entitlement) {
    throw new Error(`Entitlement not found: ${entitlementId}`);
  }
  if (entitlement.status === "GRANTED") {
    throw new Error(`Entitlement already granted: ${entitlementId}`);
  }
  await database
    .update(schema.entitlements)
    .set({
      status: "GRANTED",
      amount: input.amount,
      grantedBy: input.grantedBy,
      grantedAt: new Date(),
      note: input.note ?? null,
    })
    .where(eq(schema.entitlements.id, entitlementId));
}

export const createFamily = (input: CreateFamilyInput) => createFamilyWith(defaultDb, input);
export const listFamiliesForProject = (projectId: string) =>
  listFamiliesForProjectWith(defaultDb, projectId);
export const grantEntitlement = (
  entitlementId: string,
  input: { amount: number; grantedBy: string; note?: string }
) => grantEntitlementWith(defaultDb, entitlementId, input);
