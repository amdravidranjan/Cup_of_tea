import { beforeEach, describe, expect, it } from "vitest";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { createTestDb } from "./test-helpers";

let testDb: LibSQLDatabase<typeof schema>;

beforeEach(async () => {
  testDb = await createTestDb();
});

describe("createFamilyWith", () => {
  it("creates the family and all 6 entitlement rows as PENDING", async () => {
    const { createFamilyWith, listFamiliesForProjectWith } = await import("./families");
    const id = await createFamilyWith(testDb, {
      projectId: "p-1",
      headOfHouseholdName: "Ramesh Kumar",
      village: "Perambalur Town",
      category: "landowner",
      memberCount: 4,
      vulnerableGroup: true,
      surveyedBy: "u-district-1",
    });
    const families = await listFamiliesForProjectWith(testDb, "p-1");
    expect(families).toHaveLength(1);
    expect(families[0].id).toBe(id);
    expect(families[0].vulnerableGroup).toBe(true);
    expect(families[0].entitlements).toHaveLength(6);
    expect(families[0].entitlements.every((e) => e.status === "PENDING")).toBe(true);
  });
});

describe("listFamiliesForProjectWith", () => {
  it("scopes to the given project only", async () => {
    const { createFamilyWith, listFamiliesForProjectWith } = await import("./families");
    await createFamilyWith(testDb, {
      projectId: "p-1",
      headOfHouseholdName: "Family A",
      village: "V1",
      category: "landowner",
      memberCount: 3,
      vulnerableGroup: false,
      surveyedBy: "u-district-1",
    });
    await createFamilyWith(testDb, {
      projectId: "p-2",
      headOfHouseholdName: "Family B",
      village: "V2",
      category: "tenant",
      memberCount: 2,
      vulnerableGroup: false,
      surveyedBy: "u-district-1",
    });
    const families = await listFamiliesForProjectWith(testDb, "p-1");
    expect(families).toHaveLength(1);
    expect(families[0].headOfHouseholdName).toBe("Family A");
  });
});

describe("grantEntitlementWith", () => {
  it("marks an entitlement GRANTED with amount/grantedBy/grantedAt", async () => {
    const { createFamilyWith, listFamiliesForProjectWith, grantEntitlementWith } = await import(
      "./families"
    );
    await createFamilyWith(testDb, {
      projectId: "p-1",
      headOfHouseholdName: "Family A",
      village: "V1",
      category: "landowner",
      memberCount: 3,
      vulnerableGroup: false,
      surveyedBy: "u-district-1",
    });
    const [family] = await listFamiliesForProjectWith(testDb, "p-1");
    const entitlement = family.entitlements[0];
    await grantEntitlementWith(testDb, entitlement.id, {
      amount: 50000,
      grantedBy: "u-district-1",
      note: "Paid via bank transfer",
    });
    const [updated] = await listFamiliesForProjectWith(testDb, "p-1");
    const grantedEntitlement = updated.entitlements.find((e) => e.id === entitlement.id)!;
    expect(grantedEntitlement.status).toBe("GRANTED");
    expect(grantedEntitlement.amount).toBe(50000);
    expect(grantedEntitlement.grantedBy).toBe("u-district-1");
    expect(grantedEntitlement.grantedAt).not.toBeNull();
    expect(grantedEntitlement.note).toBe("Paid via bank transfer");
  });

  it("rejects granting an already-GRANTED entitlement", async () => {
    const { createFamilyWith, listFamiliesForProjectWith, grantEntitlementWith } = await import(
      "./families"
    );
    await createFamilyWith(testDb, {
      projectId: "p-1",
      headOfHouseholdName: "Family A",
      village: "V1",
      category: "landowner",
      memberCount: 3,
      vulnerableGroup: false,
      surveyedBy: "u-district-1",
    });
    const [family] = await listFamiliesForProjectWith(testDb, "p-1");
    const entitlementId = family.entitlements[0].id;
    await grantEntitlementWith(testDb, entitlementId, { amount: 1000, grantedBy: "u-district-1" });
    await expect(
      grantEntitlementWith(testDb, entitlementId, { amount: 2000, grantedBy: "u-district-1" })
    ).rejects.toThrow();
  });
});
