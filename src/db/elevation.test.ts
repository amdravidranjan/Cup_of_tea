import { beforeEach, describe, expect, it } from "vitest";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

let testDb: LibSQLDatabase<typeof schema>;

beforeEach(async () => {
  const client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await testDb.run(sql`
    CREATE TABLE elevation_profiles (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL UNIQUE,
      samples_json TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);
});

describe("saveElevationProfileWith / getElevationProfileWith", () => {
  it("saves and retrieves a profile", async () => {
    const { saveElevationProfileWith, getElevationProfileWith } = await import("./elevation");
    const samples = [
      { distanceMeters: 0, lng: 82.6, lat: 18.7, elevationMeters: 900 },
      { distanceMeters: 500, lng: 82.61, lat: 18.71, elevationMeters: 920 },
    ];
    await saveElevationProfileWith(testDb, "p-1", samples);
    const result = await getElevationProfileWith(testDb, "p-1");
    expect(result).toEqual(samples);
  });

  it("returns null when no profile exists for a project", async () => {
    const { getElevationProfileWith } = await import("./elevation");
    expect(await getElevationProfileWith(testDb, "does-not-exist")).toBeNull();
  });

  it("upserts — a second save for the same project replaces the first", async () => {
    const { saveElevationProfileWith, getElevationProfileWith } = await import("./elevation");
    await saveElevationProfileWith(testDb, "p-1", [
      { distanceMeters: 0, lng: 0, lat: 0, elevationMeters: 100 },
    ]);
    await saveElevationProfileWith(testDb, "p-1", [
      { distanceMeters: 0, lng: 0, lat: 0, elevationMeters: 200 },
    ]);
    const result = await getElevationProfileWith(testDb, "p-1");
    expect(result).toHaveLength(1);
    expect(result![0].elevationMeters).toBe(200);
  });
});
