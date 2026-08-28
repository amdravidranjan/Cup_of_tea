import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import { parcels } from "./schema";
import * as schema from "./schema";
import type { ParcelStatus } from "@/lib/parcel-status";
import type { PolygonGeometry } from "@/lib/geo";

type Db = LibSQLDatabase<typeof schema>;

export interface CreateParcelInput {
  projectId: string;
  village: string;
  areaHectares: number;
  status: ParcelStatus;
  geometry: PolygonGeometry;
}

export interface Parcel {
  id: string;
  projectId: string;
  village: string;
  areaHectares: number;
  status: ParcelStatus;
  geometry: PolygonGeometry;
  createdAt: Date;
}

function toParcel(row: {
  id: string;
  projectId: string;
  village: string;
  areaHectares: number;
  status: string;
  geometryGeoJson: string;
  createdAt: Date;
}): Parcel {
  return {
    id: row.id,
    projectId: row.projectId,
    village: row.village,
    areaHectares: row.areaHectares,
    status: row.status as ParcelStatus,
    geometry: { type: "Polygon", coordinates: JSON.parse(row.geometryGeoJson) },
    createdAt: row.createdAt,
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
  });
  return id;
}

export async function listParcelsWith(database: Db, projectId: string): Promise<Parcel[]> {
  const rows = await database.select().from(parcels).where(eq(parcels.projectId, projectId));
  return rows.map(toParcel);
}

export const createParcel = (input: CreateParcelInput) => createParcelWith(defaultDb, input);
export const listParcels = (projectId: string) => listParcelsWith(defaultDb, projectId);
