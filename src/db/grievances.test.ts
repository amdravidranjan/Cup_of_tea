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
    CREATE TABLE projects (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, purpose TEXT NOT NULL,
      state TEXT NOT NULL, district TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'DRAFT',
      created_by TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      geometry_type TEXT, geometry_geo_json TEXT, rr_stage TEXT
    );
  `);
  await testDb.run(sql`
    CREATE TABLE grievances (
      id TEXT PRIMARY KEY, tracking_number TEXT NOT NULL UNIQUE, type TEXT NOT NULL,
      project_id TEXT NOT NULL, compensation_id TEXT, submitter_name TEXT NOT NULL,
      submitter_contact TEXT, description TEXT NOT NULL,
      attachment_file_name TEXT, attachment_storage_path TEXT,
      status TEXT NOT NULL DEFAULT 'FILED',
      resolution TEXT, resolution_note TEXT, resolved_by TEXT, resolved_at INTEGER,
      created_at INTEGER NOT NULL
    );
  `);

  await testDb.insert(schema.projects).values([
    {
      id: "p-1",
      name: "Test Project",
      purpose: "Testing",
      state: "Tamil Nadu",
      district: "Chennai",
      stage: "AWARDED",
      createdBy: "u-agency-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "p-2",
      name: "Other State Project",
      purpose: "Testing",
      state: "Odisha",
      district: "Koraput",
      stage: "AWARDED",
      createdBy: "u-agency-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
});

describe("createGrievanceWith", () => {
  it("creates a grievance and returns a tracking number", async () => {
    const { createGrievanceWith } = await import("./grievances");
    const trackingNumber = await createGrievanceWith(testDb, {
      type: "GENERAL_GRIEVANCE",
      projectId: "p-1",
      submitterName: "Ramesh Kumar",
      description: "The notified boundary seems to include my house.",
    });
    expect(trackingNumber).toMatch(/^GRV-\d{4}-[A-Z0-9]{6}$/);
  });
});

describe("getGrievanceByTrackingNumberWith", () => {
  it("returns the grievance for a valid tracking number", async () => {
    const { createGrievanceWith, getGrievanceByTrackingNumberWith } = await import(
      "./grievances"
    );
    const trackingNumber = await createGrievanceWith(testDb, {
      type: "COMPENSATION_DISPUTE",
      projectId: "p-1",
      submitterName: "Lakshmi",
      description: "Compensation amount is too low for market rate.",
    });
    const grievance = await getGrievanceByTrackingNumberWith(testDb, trackingNumber);
    expect(grievance?.submitterName).toBe("Lakshmi");
    expect(grievance?.status).toBe("FILED");
    expect(grievance?.attachmentFileName).toBeNull();
  });

  it("returns null for an unknown tracking number", async () => {
    const { getGrievanceByTrackingNumberWith } = await import("./grievances");
    expect(await getGrievanceByTrackingNumberWith(testDb, "GRV-2026-ZZZZZZ")).toBeNull();
  });

  it("records an attachment when one is provided", async () => {
    const { createGrievanceWith, getGrievanceByTrackingNumberWith } = await import(
      "./grievances"
    );
    const trackingNumber = await createGrievanceWith(testDb, {
      type: "GENERAL_GRIEVANCE",
      projectId: "p-1",
      submitterName: "A",
      description: "Objection with supporting document",
      attachmentFileName: "sale-deed.pdf",
      attachmentStoragePath: "grievances/abc123-sale-deed.pdf",
    });
    const grievance = await getGrievanceByTrackingNumberWith(testDb, trackingNumber);
    expect(grievance?.attachmentFileName).toBe("sale-deed.pdf");
    expect(grievance?.attachmentStoragePath).toBe("grievances/abc123-sale-deed.pdf");
  });
});

describe("listGrievancesWith", () => {
  it("lists all grievances with project context, newest first", async () => {
    const { createGrievanceWith, listGrievancesWith } = await import("./grievances");
    await createGrievanceWith(testDb, {
      type: "GENERAL_GRIEVANCE",
      projectId: "p-1",
      submitterName: "A",
      description: "First",
    });
    // createdAt is stored with whole-second precision (drizzle's sqlite
    // integer timestamp mode) — straddle a second boundary to observe
    // "newest first" ordering reliably.
    await new Promise((r) => setTimeout(r, 1100));
    await createGrievanceWith(testDb, {
      type: "GENERAL_GRIEVANCE",
      projectId: "p-2",
      submitterName: "B",
      description: "Second",
    });
    const list = await listGrievancesWith(testDb);
    expect(list).toHaveLength(2);
    expect(list[0].projectName).toBe("Other State Project");
  });

  it("filters by state", async () => {
    const { createGrievanceWith, listGrievancesWith } = await import("./grievances");
    await createGrievanceWith(testDb, {
      type: "GENERAL_GRIEVANCE",
      projectId: "p-1",
      submitterName: "A",
      description: "First",
    });
    await createGrievanceWith(testDb, {
      type: "GENERAL_GRIEVANCE",
      projectId: "p-2",
      submitterName: "B",
      description: "Second",
    });
    const list = await listGrievancesWith(testDb, { state: "Tamil Nadu" });
    expect(list).toHaveLength(1);
    expect(list[0].submitterName).toBe("A");
  });
});

describe("transitionGrievanceStatusWith", () => {
  it("advances FILED -> UNDER_REVIEW -> RESOLVED with a resolution recorded", async () => {
    const { createGrievanceWith, transitionGrievanceStatusWith, getGrievanceByTrackingNumberWith } =
      await import("./grievances");
    const trackingNumber = await createGrievanceWith(testDb, {
      type: "GENERAL_GRIEVANCE",
      projectId: "p-1",
      submitterName: "A",
      description: "First",
    });
    const created = await getGrievanceByTrackingNumberWith(testDb, trackingNumber);

    await transitionGrievanceStatusWith(testDb, created!.id, "START_REVIEW", "district", "u-district-1");
    const underReview = await getGrievanceByTrackingNumberWith(testDb, trackingNumber);
    expect(underReview?.status).toBe("UNDER_REVIEW");

    await transitionGrievanceStatusWith(
      testDb,
      created!.id,
      "RESOLVE",
      "district",
      "u-district-1",
      { resolution: "REJECTED", resolutionNote: "Boundary confirmed correct per survey." }
    );
    const resolved = await getGrievanceByTrackingNumberWith(testDb, trackingNumber);
    expect(resolved?.status).toBe("RESOLVED");
    expect(resolved?.resolution).toBe("REJECTED");
    expect(resolved?.resolvedBy).toBe("u-district-1");
    expect(resolved?.resolvedAt).not.toBeNull();
  });

  it("rejects an invalid transition", async () => {
    const { createGrievanceWith, transitionGrievanceStatusWith, getGrievanceByTrackingNumberWith } =
      await import("./grievances");
    const trackingNumber = await createGrievanceWith(testDb, {
      type: "GENERAL_GRIEVANCE",
      projectId: "p-1",
      submitterName: "A",
      description: "First",
    });
    const created = await getGrievanceByTrackingNumberWith(testDb, trackingNumber);
    await expect(
      transitionGrievanceStatusWith(testDb, created!.id, "RESOLVE", "district", "u-district-1")
    ).rejects.toThrow();
  });
});
