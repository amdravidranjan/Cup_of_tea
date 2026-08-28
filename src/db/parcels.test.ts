import { beforeEach, describe, expect, it } from "vitest";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import type { PolygonGeometry } from "@/lib/geo";

// See src/db/projects.test.ts for why this isn't `ReturnType<typeof drizzle>`.
let testDb: LibSQLDatabase<typeof schema>;

beforeEach(async () => {
  const client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await testDb.run(sql`
    CREATE TABLE parcels (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, village TEXT NOT NULL,
      area_hectares REAL NOT NULL, status TEXT NOT NULL,
      geometry_geo_json TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);
});

const square: PolygonGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [82.71, 18.81],
      [82.71, 18.812],
      [82.712, 18.812],
      [82.712, 18.81],
      [82.71, 18.81],
    ],
  ],
};

describe("parcels data layer", () => {
  it("creates a parcel and reconstructs its geometry on read", async () => {
    const { createParcelWith, listParcelsWith } = await import("./parcels");
    await createParcelWith(testDb, {
      projectId: "p-1",
      village: "Similiguda",
      areaHectares: 1.2,
      status: "NOTIFIED",
      geometry: square,
    });
    const list = await listParcelsWith(testDb, "p-1");
    expect(list).toHaveLength(1);
    expect(list[0].village).toBe("Similiguda");
    expect(list[0].status).toBe("NOTIFIED");
    expect(list[0].geometry).toEqual(square);
  });

  it("scopes parcels to their project", async () => {
    const { createParcelWith, listParcelsWith } = await import("./parcels");
    await createParcelWith(testDb, {
      projectId: "p-1",
      village: "A",
      areaHectares: 1,
      status: "NOTIFIED",
      geometry: square,
    });
    await createParcelWith(testDb, {
      projectId: "p-2",
      village: "B",
      areaHectares: 1,
      status: "NOTIFIED",
      geometry: square,
    });
    const listP1 = await listParcelsWith(testDb, "p-1");
    expect(listP1).toHaveLength(1);
    expect(listP1[0].village).toBe("A");
  });
});
