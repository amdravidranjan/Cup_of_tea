/**
 * Seeds the flagship demo project.
 *
 * Deliberately seeded almost empty: the project exists, its alignment is
 * drawn across the Bhavani, and the district rate is set — but there are no
 * parcels and no families. Those arrive by uploading the land records in
 * `demo-kit/flagship/records/`, which is the point of the demo. Seeding the
 * plots would skip the part worth showing.
 *
 *   npx tsx src/db/seed-flagship.ts
 */

import { eq } from "drizzle-orm";
import { db } from "./client";
import * as schema from "./schema";
import { setProjectGeometry } from "./projects";
import { setCompensationRate } from "./compensation";
import { recordAuditWith } from "./audit";
import { FLAGSHIP } from "./flagship-project";
import { demoProject } from "./demo-project";
import { DEFAULT_REGION, type DemoRegion } from "@/lib/demo/regions";

const CREATED_BY = "u-agency-1";
const CREATED_AT = new Date("2026-01-14T09:30:00Z");

export interface SeedFlagshipOptions {
  /** Project id to seed under. Defaults to the flagship's own id. */
  id?: string;
  /** Suppress the console summary (used when seeding a judge's sandbox). */
  quiet?: boolean;
  /**
   * Where to site the project. A judge who takes the walkthrough in Kannada
   * gets the Karnataka case, with its own district, villages and names.
   * Defaults to the flagship's Tamil Nadu crossing.
   */
  region?: DemoRegion;
}

export async function seedFlagship(opts: SeedFlagshipOptions = {}): Promise<string> {
  const projectId = opts.id ?? FLAGSHIP.id;
  const demo = demoProject(opts.region ?? DEFAULT_REGION);
  const totals = demo.totals;

  // Idempotent: re-seeding replaces the project rather than duplicating it,
  // so the demo can be reset between rehearsals.
  await db.delete(schema.parcels).where(eq(schema.parcels.projectId, projectId));
  await db.delete(schema.families).where(eq(schema.families.projectId, projectId));
  await db.delete(schema.documents).where(eq(schema.documents.projectId, projectId));
  await db.delete(schema.stageHistory).where(eq(schema.stageHistory.projectId, projectId));
  await db.delete(schema.gramSabhaConsultations).where(eq(schema.gramSabhaConsultations.projectId, projectId));
  await db.delete(schema.infrastructureItems).where(eq(schema.infrastructureItems.projectId, projectId));
  await db.delete(schema.projects).where(eq(schema.projects.id, projectId));

  await db.insert(schema.projects).values({
    id: projectId,
    name: demo.name,
    purpose: demo.purpose,
    state: demo.state,
    district: demo.district,
    stage: "DRAFT",
    createdBy: CREATED_BY,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });

  await db.insert(schema.stageHistory).values({
    id: crypto.randomUUID(),
    projectId: projectId,
    fromStage: null,
    toStage: "DRAFT",
    action: "CREATE",
    actorId: CREATED_BY,
    actorRole: "agency",
    createdAt: CREATED_AT,
  });

  await setProjectGeometry(projectId, {
    type: "LineString",
    coordinates: demo.alignment,
  });

  // The rate the award will be computed from, set before any assessment so
  // the compensation tab is usable the moment parcels exist.
  await setCompensationRate({
    state: demo.state,
    district: demo.district,
    ratePerHectare: demo.ratePerHectare,
    multiplier: 2.0, // rural multiplier under the First Schedule
    setBy: "u-district-1",
  });

  // The Third Schedule infrastructure the resettlement site must provide.
  const infrastructure = [
    "All-weather approach road to the resettlement site",
    "Drainage and sanitation",
    "Drinking water supply",
    "Electricity connection to each household",
    "Panchayat / community centre",
    "Anganwadi and primary school",
    "Primary health sub-centre",
    "Burial and cremation ground",
    "Fair price shop",
    "Village pond and cattle stand",
  ];
  await db.insert(schema.infrastructureItems).values(
    infrastructure.map((item) => ({
      id: crypto.randomUUID(),
      projectId: projectId,
      item,
      status: "PENDING" as const,
    }))
  );

  await recordAuditWith(db, {
    actor: { userId: CREATED_BY, role: "agency" },
    action: "CREATE",
    entityType: "PROJECT",
    entityId: projectId,
    projectId: projectId,
    summary: `Created project "${demo.name}" in ${demo.district}, ${demo.state}`,
    after: {
      name: demo.name,
      purpose: demo.purpose,
      state: demo.state,
      district: demo.district,
      stage: "DRAFT",
    },
  });

  if (opts.quiet) return projectId;
  console.log(`Seeded ${demo.name}`);
  console.log(`  ${demo.taluk} taluk, ${demo.district} — alignment across the ${demo.region.river} at ${demo.region.town}`);
  console.log(`  stage DRAFT, no parcels and no families yet — upload the records to create them`);
  console.log(`  the kit holds ${totals.parcelCount} plots (${totals.totalHectares} ha) and ${totals.affectedFamilyCount} affected families`);
  console.log(`  build the kit first:  npx tsx scripts/build-flagship-kit.ts`);
  return projectId;
}

if (process.argv[1]?.includes("seed-flagship")) {
  seedFlagship()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
