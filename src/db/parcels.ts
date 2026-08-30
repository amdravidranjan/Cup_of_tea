import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import { parcels } from "./schema";
import * as schema from "./schema";
import { nextParcelStatus, type ParcelStatus } from "@/lib/parcel-status";
import type { PolygonGeometry } from "@/lib/geo";

type Db = LibSQLDatabase<typeof schema>;

export interface CreateParcelInput {
  projectId: string;
  village: string;
  areaHectares: number;
  status: ParcelStatus;
  geometry: PolygonGeometry;
  surveyNumber?: string;
  pattaNumber?: string;
}

export interface Parcel {
  id: string;
  projectId: string;
  village: string;
  areaHectares: number;
  status: ParcelStatus;
  geometry: PolygonGeometry;
  createdAt: Date;
  surveyNumber: string | null;
  pattaNumber: string | null;
}

function toParcel(row: {
  id: string;
  projectId: string;
  village: string;
  areaHectares: number;
  status: string;
  geometryGeoJson: string;
  createdAt: Date;
  surveyNumber: string | null;
  pattaNumber: string | null;
}): Parcel {
  return {
    id: row.id,
    projectId: row.projectId,
    village: row.village,
    areaHectares: row.areaHectares,
    status: row.status as ParcelStatus,
    geometry: { type: "Polygon", coordinates: JSON.parse(row.geometryGeoJson) },
    createdAt: row.createdAt,
    surveyNumber: row.surveyNumber,
    pattaNumber: row.pattaNumber,
  };
}

export async function createParcelWith(
  database: Db,
  input: CreateParcelInput
): Promise<string> {
  const id = crypto.randomUUID();
  await database.insert(parcels).values({
    id,
    projectId: input.projectId,
    village: input.village,
    areaHectares: input.areaHectares,
    status: input.status,
    geometryGeoJson: JSON.stringify(input.geometry.coordinates),
    createdAt: new Date(),
    surveyNumber: input.surveyNumber ?? null,
    pattaNumber: input.pattaNumber ?? null,
  });
  return id;
}

export async function listParcelsWith(database: Db, projectId: string): Promise<Parcel[]> {
  const rows = await database.select().from(parcels).where(eq(parcels.projectId, projectId));
  return rows.map(toParcel);
}

export async function getParcelWith(database: Db, id: string): Promise<Parcel | null> {
  const rows = await database.select().from(parcels).where(eq(parcels.id, id));
  return rows[0] ? toParcel(rows[0]) : null;
}

export async function advanceParcelStatusWith(database: Db, id: string): Promise<ParcelStatus> {
  const rows = await database.select().from(parcels).where(eq(parcels.id, id));
  const row = rows[0];
  if (!row) {
    throw new Error(`Parcel not found: ${id}`);
  }
  const next = nextParcelStatus(row.status as ParcelStatus);
  if (!next) {
    throw new Error(`Parcel ${id} is already POSSESSED`);
  }
  await database.update(parcels).set({ status: next }).where(eq(parcels.id, id));
  return next;
}

export const createParcel = (input: CreateParcelInput) => createParcelWith(defaultDb, input);
export const listParcels = (projectId: string) => listParcelsWith(defaultDb, projectId);
export const getParcel = (id: string) => getParcelWith(defaultDb, id);
export const advanceParcelStatus = (id: string) => advanceParcelStatusWith(defaultDb, id);
