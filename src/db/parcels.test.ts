import { beforeEach, describe, expect, it } from "vitest";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import type { PolygonGeometry } from "@/lib/geo";
import { createTestDb } from "./test-helpers";

// See src/db/projects.test.ts for why this isn't `ReturnType<typeof drizzle>`.
let testDb: LibSQLDatabase<typeof schema>;

beforeEach(async () => {
  testDb = await createTestDb();
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

  it("stores survey/patta numbers and defaults them to null when omitted", async () => {
    const { createParcelWith, getParcelWith } = await import("./parcels");
    const withNumbers = await createParcelWith(testDb, {
      projectId: "p-1",
      village: "Similiguda",
      areaHectares: 1.2,
      status: "NOTIFIED",
      geometry: square,
      surveyNumber: "101/2",
      pattaNumber: "KOR-PTA-00001",
    });
    const withoutNumbers = await createParcelWith(testDb, {
      projectId: "p-1",
      village: "Similiguda",
      areaHectares: 1.2,
      status: "NOTIFIED",
      geometry: square,
    });
    expect((await getParcelWith(testDb, withNumbers))?.surveyNumber).toBe("101/2");
    expect((await getParcelWith(testDb, withNumbers))?.pattaNumber).toBe("KOR-PTA-00001");
    expect((await getParcelWith(testDb, withoutNumbers))?.surveyNumber).toBeNull();
    expect((await getParcelWith(testDb, withoutNumbers))?.pattaNumber).toBeNull();
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

  it("fetches a single parcel by id", async () => {
    const { createParcelWith, getParcelWith } = await import("./parcels");
    const id = await createParcelWith(testDb, {
      projectId: "p-1",
      village: "Similiguda",
      areaHectares: 1.2,
      status: "NOTIFIED",
      geometry: square,
    });
    const parcel = await getParcelWith(testDb, id);
    expect(parcel?.village).toBe("Similiguda");
    expect(parcel?.projectId).toBe("p-1");
  });

  it("advances a parcel's status to the next stage", async () => {
    const { createParcelWith, advanceParcelStatusWith, getParcelWith } = await import(
      "./parcels"
    );
    const id = await createParcelWith(testDb, {
      projectId: "p-1",
      village: "Similiguda",
      areaHectares: 1.2,
      status: "NOTIFIED",
      geometry: square,
    });
    const status = await advanceParcelStatusWith(testDb, id);
    expect(status).toBe("ACQUIRED");
    const parcel = await getParcelWith(testDb, id);
    expect(parcel?.status).toBe("ACQUIRED");
  });

  it("rejects advancing a parcel that is already POSSESSED", async () => {
    const { createParcelWith, advanceParcelStatusWith } = await import("./parcels");
    const id = await createParcelWith(testDb, {
      projectId: "p-1",
      village: "Similiguda",
      areaHectares: 1.2,
      status: "POSSESSED",
      geometry: square,
    });
    await expect(advanceParcelStatusWith(testDb, id)).rejects.toThrow();
  });

  it("rejects advancing a parcel that does not exist", async () => {
    const { advanceParcelStatusWith } = await import("./parcels");
    await expect(advanceParcelStatusWith(testDb, "does-not-exist")).rejects.toThrow();
  });
});
