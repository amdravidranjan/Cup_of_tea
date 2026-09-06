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
import { FLAGSHIP, ALIGNMENT, buildParcels, buildHolders, buildSurveyedFamilies, flagshipTotals } from "./flagship-project";

const CREATED_BY = "u-agency-1";
const CREATED_AT = new Date("2026-01-14T09:30:00Z");

export async function seedFlagship(): Promise<void> {
  const totals = flagshipTotals(buildParcels(), buildHolders(buildParcels()), buildSurveyedFamilies(buildParcels()));

  // Idempotent: re-seeding replaces the project rather than duplicating it,
  // so the demo can be reset between rehearsals.
  await db.delete(schema.parcels).where(eq(schema.parcels.projectId, FLAGSHIP.id));
  await db.delete(schema.families).where(eq(schema.families.projectId, FLAGSHIP.id));
  await db.delete(schema.documents).where(eq(schema.documents.projectId, FLAGSHIP.id));
  await db.delete(schema.stageHistory).where(eq(schema.stageHistory.projectId, FLAGSHIP.id));
  await db.delete(schema.gramSabhaConsultations).where(eq(schema.gramSabhaConsultations.projectId, FLAGSHIP.id));
  await db.delete(schema.infrastructureItems).where(eq(schema.infrastructureItems.projectId, FLAGSHIP.id));
  await db.delete(schema.projects).where(eq(schema.projects.id, FLAGSHIP.id));

  await db.insert(schema.projects).values({
    id: FLAGSHIP.id,
    name: FLAGSHIP.name,
    purpose: FLAGSHIP.purpose,
    state: FLAGSHIP.state,
    district: FLAGSHIP.district,
    stage: "DRAFT",
    createdBy: CREATED_BY,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });

  await db.insert(schema.stageHistory).values({
    id: crypto.randomUUID(),
    projectId: FLAGSHIP.id,
    fromStage: null,
    toStage: "DRAFT",
    action: "CREATE",
    actorId: CREATED_BY,
    actorRole: "agency",
    createdAt: CREATED_AT,
  });

  await setProjectGeometry(FLAGSHIP.id, {
    type: "LineString",
    coordinates: ALIGNMENT,
  });

  // The rate the award will be computed from, set before any assessment so
  // the compensation tab is usable the moment parcels exist.
  await setCompensationRate({
    state: FLAGSHIP.state,
    district: FLAGSHIP.district,
    ratePerHectare: 2_950_000,
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
      projectId: FLAGSHIP.id,
      item,
      status: "PENDING" as const,
    }))
  );

  await recordAuditWith(db, {
    actor: { userId: CREATED_BY, role: "agency" },
    action: "CREATE",
    entityType: "PROJECT",
    entityId: FLAGSHIP.id,
    projectId: FLAGSHIP.id,
    summary: `Created project "${FLAGSHIP.name}" in ${FLAGSHIP.district}, ${FLAGSHIP.state}`,
    after: {
      name: FLAGSHIP.name,
      purpose: FLAGSHIP.purpose,
      state: FLAGSHIP.state,
      district: FLAGSHIP.district,
      stage: "DRAFT",
    },
  });

  console.log(`Seeded ${FLAGSHIP.name}`);
  console.log(`  ${FLAGSHIP.taluk} taluk, ${FLAGSHIP.district} — alignment across the Bhavani at Sirumugai`);
  console.log(`  stage DRAFT, no parcels and no families yet — upload the records to create them`);
  console.log(`  the kit holds ${totals.parcelCount} plots (${totals.totalHectares} ha) and ${totals.affectedFamilyCount} affected families`);
  console.log(`  build the kit first:  npx tsx scripts/build-flagship-kit.ts`);
}

if (process.argv[1]?.includes("seed-flagship")) {
  seedFlagship()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
