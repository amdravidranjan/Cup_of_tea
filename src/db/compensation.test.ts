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
    CREATE TABLE compensation_rates (
      id TEXT PRIMARY KEY, state TEXT NOT NULL, district TEXT NOT NULL,
      rate_per_hectare REAL NOT NULL, multiplier REAL NOT NULL,
      set_by TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);
  await testDb.run(sql`
    CREATE TABLE compensations (
      id TEXT PRIMARY KEY, parcel_id TEXT NOT NULL, project_id TEXT NOT NULL,
      rate_per_hectare REAL NOT NULL, multiplier REAL NOT NULL, assets_value REAL NOT NULL,
      market_value REAL NOT NULL, multiplied_market_value REAL NOT NULL,
      solatium REAL NOT NULL, interest REAL NOT NULL, total REAL NOT NULL,
      status TEXT NOT NULL, assessed_by TEXT NOT NULL, assessed_at INTEGER NOT NULL,
      paid_at INTEGER
    );
  `);
});

describe("compensation rates", () => {
  it("returns null when no rate has been set", async () => {
    const { getCurrentCompensationRateWith } = await import("./compensation");
    expect(await getCurrentCompensationRateWith(testDb, "Odisha", "Koraput")).toBeNull();
  });

  it("returns the most recently set rate for a state/district", async () => {
    const { setCompensationRateWith, getCurrentCompensationRateWith } = await import(
      "./compensation"
    );
    await setCompensationRateWith(testDb, {
      state: "Odisha",
      district: "Koraput",
      ratePerHectare: 1_000_000,
      multiplier: 1,
      setBy: "u-district-1",
    });
    // createdAt is stored with whole-second precision (drizzle's sqlite
    // `integer(..., { mode: "timestamp" })` truncates to Unix seconds) —
    // real rate-setting never happens twice within the same second, but
    // this test has to straddle a second boundary to observe "latest wins".
    await new Promise((r) => setTimeout(r, 1100));
    await setCompensationRateWith(testDb, {
      state: "Odisha",
      district: "Koraput",
      ratePerHectare: 1_500_000,
      multiplier: 1.5,
      setBy: "u-district-1",
    });
    const current = await getCurrentCompensationRateWith(testDb, "Odisha", "Koraput");
    expect(current?.ratePerHectare).toBe(1_500_000);
    expect(current?.multiplier).toBe(1.5);
  });

  it("lists full rate history for a state/district, newest first", async () => {
    const { setCompensationRateWith, listCompensationRatesWith } = await import("./compensation");
    await setCompensationRateWith(testDb, {
      state: "Odisha",
      district: "Koraput",
      ratePerHectare: 1_000_000,
      multiplier: 1,
      setBy: "u-district-1",
    });
    await new Promise((r) => setTimeout(r, 1100));
    await setCompensationRateWith(testDb, {
      state: "Odisha",
      district: "Koraput",
      ratePerHectare: 1_500_000,
      multiplier: 1.5,
      setBy: "u-district-2",
    });
    const history = await listCompensationRatesWith(testDb, "Odisha", "Koraput");
    expect(history).toHaveLength(2);
    expect(history[0].ratePerHectare).toBe(1_500_000);
    expect(history[1].ratePerHectare).toBe(1_000_000);
  });

  it("scopes rate history to the given state/district", async () => {
    const { setCompensationRateWith, listCompensationRatesWith } = await import("./compensation");
    await setCompensationRateWith(testDb, {
      state: "Odisha",
      district: "Koraput",
      ratePerHectare: 1_000_000,
      multiplier: 1,
      setBy: "u-district-1",
    });
    await setCompensationRateWith(testDb, {
      state: "Tamil Nadu",
      district: "Chennai",
      ratePerHectare: 5_000_000,
      multiplier: 2,
      setBy: "u-district-2",
    });
    const history = await listCompensationRatesWith(testDb, "Odisha", "Koraput");
    expect(history).toHaveLength(1);
    expect(history[0].district).toBe("Koraput");
  });
});

describe("compensation records", () => {
  const baseRecord = {
    parcelId: "parcel-1",
    projectId: "project-1",
    ratePerHectare: 1_000_000,
    multiplier: 1,
    assetsValue: 0,
    marketValue: 1_000_000,
    multipliedMarketValue: 1_000_000,
    solatium: 1_000_000,
    interest: 0,
    total: 2_000_000,
    assessedBy: "u-district-1",
  };

  it("creates a compensation record with ASSESSED status", async () => {
    const { createCompensationWith, listCompensationsForProjectWith } = await import(
      "./compensation"
    );
    await createCompensationWith(testDb, baseRecord);
    const list = await listCompensationsForProjectWith(testDb, "project-1");
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe("ASSESSED");
    expect(list[0].total).toBe(2_000_000);
  });

  it("marks a record as PAID with a paidAt timestamp", async () => {
    const { createCompensationWith, markCompensationPaidWith, listCompensationsForProjectWith } =
      await import("./compensation");
    const id = await createCompensationWith(testDb, baseRecord);
    await markCompensationPaidWith(testDb, id);
    const list = await listCompensationsForProjectWith(testDb, "project-1");
    expect(list[0].status).toBe("PAID");
    expect(list[0].paidAt).not.toBeNull();
  });

  it("scopes compensation records to their project", async () => {
    const { createCompensationWith, listCompensationsForProjectWith } = await import(
      "./compensation"
    );
    await createCompensationWith(testDb, baseRecord);
    await createCompensationWith(testDb, { ...baseRecord, projectId: "project-2" });
    const list = await listCompensationsForProjectWith(testDb, "project-1");
    expect(list).toHaveLength(1);
  });
});
