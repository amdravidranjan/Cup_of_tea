import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";
import type { ElevationSample } from "@/lib/elevation";

type Db = LibSQLDatabase<typeof schema>;

export async function saveElevationProfileWith(
  database: Db,
  projectId: string,
  samples: ElevationSample[]
): Promise<void> {
  await database
    .insert(schema.elevationProfiles)
    .values({
      id: crypto.randomUUID(),
      projectId,
      samplesJson: JSON.stringify(samples),
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.elevationProfiles.projectId,
      set: { samplesJson: JSON.stringify(samples), createdAt: new Date() },
    });
}

export async function getElevationProfileWith(
  database: Db,
  projectId: string
): Promise<ElevationSample[] | null> {
  const rows = await database
    .select()
    .from(schema.elevationProfiles)
    .where(eq(schema.elevationProfiles.projectId, projectId));
  if (!rows[0]) return null;
  return JSON.parse(rows[0].samplesJson) as ElevationSample[];
}

export const saveElevationProfile = (projectId: string, samples: ElevationSample[]) =>
  saveElevationProfileWith(defaultDb, projectId, samples);
export const getElevationProfile = (projectId: string) =>
  getElevationProfileWith(defaultDb, projectId);
