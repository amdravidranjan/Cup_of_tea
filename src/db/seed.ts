import { db } from "./client";
import { eq } from "drizzle-orm";
import { users, projects, stageHistory, rrStageHistory, compensations, parcels } from "./schema";
import { DEMO_USERS } from "./seed-data";
import { saveFile } from "@/lib/storage";
import { createDocument } from "./documents";
import { setProjectGeometry } from "./projects";
import { setCompensationRate } from "./compensation";
import { getProject } from "./projects";
import { transitionProject, type Action, type Role, type Stage } from "@/lib/workflow";
import { transitionRR, type RRAction, type RRStage } from "@/lib/rr-workflow";
import { calculateCompensation } from "@/lib/compensation";
import { generateCorridorParcels, generateGridParcels } from "@/lib/parcel-generation";
import type { Geometry, LineGeometry, PolygonGeometry } from "@/lib/geo";
import type { ParcelStatus } from "@/lib/parcel-status";

const SEED_ACTOR_IDS: Record<Role, string> = {
  agency: "u-agency-1",
  district: "u-district-1",
  state: "u-state-1",
  central: "u-central-1",
  field: "u-field-1",
};

function monthsAgo(n: number): Date {
  return new Date(Date.now() - Math.round(n * 30) * 24 * 60 * 60 * 1000);
}

async function seedProjectTransition(
  projectId: string,
  action: Action,
  actorRole: Role,
  occurredAt: Date
): Promise<Stage> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);
  const nextStage = transitionProject(project.stage as Stage, action, actorRole);
  await db
    .update(projects)
    .set({ stage: nextStage, updatedAt: occurredAt })
    .where(eq(projects.id, projectId));
  await db.insert(stageHistory).values({
    id: crypto.randomUUID(),
    projectId,
    fromStage: project.stage,
    toStage: nextStage,
    action,
    actorId: SEED_ACTOR_IDS[actorRole],
    actorRole,
    createdAt: occurredAt,
  });
  return nextStage;
}

async function seedRRTransition(
  projectId: string,
  action: RRAction,
  actorRole: Role,
  occurredAt: Date
): Promise<RRStage> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);
  const currentStage = (project.rrStage as RRStage | null) ?? null;
  const nextStage = transitionRR(currentStage, action, actorRole);
  await db.update(projects).set({ rrStage: nextStage }).where(eq(projects.id, projectId));
  await db.insert(rrStageHistory).values({
    id: crypto.randomUUID(),
    projectId,
    fromStage: currentStage,
    toStage: nextStage,
    action,
    actorId: SEED_ACTOR_IDS[actorRole],
    actorRole,
    note: null,
    createdAt: occurredAt,
  });
  return nextStage;
}

interface SeededParcel {
  id: string;
  areaHectares: number;
}

/**
 * Assesses compensation for every parcel in a project (a real Collector
 * assesses every acquired parcel individually) and marks `paidFraction`
 * of them PAID — 0 for "breached, nothing paid", 1 for "fully paid",
 * something in between for "at-risk, partially paid". Bulk-inserted for
 * performance at realistic (hundreds-of-parcels) scale.
 */
async function seedCompensationForParcels(
  parcelList: SeededParcel[],
  projectId: string,
  rate: { ratePerHectare: number; multiplier: number },
  notifiedAt: Date,
  awardedAt: Date,
  assetsValuePerHectare: number,
  paidFraction: number,
  paidAt: Date
): Promise<void> {
  const paidCount = Math.round(parcelList.length * paidFraction);
  const rows = parcelList.map((parcel, i) => {
    const breakdown = calculateCompensation({
      areaHectares: parcel.areaHectares,
      ratePerHectare: rate.ratePerHectare,
      multiplier: rate.multiplier,
      assetsValue: assetsValuePerHectare * parcel.areaHectares,
      sIANotificationDate: notifiedAt,
      awardDate: awardedAt,
    });
    const isPaid = i < paidCount;
    return {
      id: crypto.randomUUID(),
      parcelId: parcel.id,
      projectId,
      ratePerHectare: rate.ratePerHectare,
      multiplier: rate.multiplier,
      assetsValue: breakdown.assetsValue,
      marketValue: breakdown.marketValue,
      multipliedMarketValue: breakdown.multipliedMarketValue,
      solatium: breakdown.solatium,
      interest: breakdown.interest,
      total: breakdown.total,
      status: isPaid ? "PAID" : "ASSESSED",
      assessedBy: SEED_ACTOR_IDS.district,
      assessedAt: awardedAt,
      paidAt: isPaid ? paidAt : null,
    };
  });
  await db.insert(compensations).values(rows);
}

type ParcelGeneratorConfig =
  | { kind: "corridor"; villages: [string, string]; rowWidthMeters?: number }
  | { kind: "grid"; villages: [string, string]; targetParcelHectares?: number };

interface SeedProjectInput {
  id: string;
  name: string;
  purpose: string;
  state: string;
  district: string;
  createdBy: string;
  createdAt: Date;
  geometry: Geometry;
  parcelStatus: ParcelStatus;
  parcelGenerator: ParcelGeneratorConfig;
  seed: number;
  rate: { ratePerHectare: number; multiplier: number };
}

async function createSeedProject(input: SeedProjectInput): Promise<SeededParcel[]> {
  await db.insert(projects).values({
    id: input.id,
    name: input.name,
    purpose: input.purpose,
    state: input.state,
    district: input.district,
    stage: "DRAFT",
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  });
  await db.insert(stageHistory).values({
    id: crypto.randomUUID(),
    projectId: input.id,
    fromStage: null,
    toStage: "DRAFT",
    action: "CREATE",
    actorId: input.createdBy,
    actorRole: "agency",
    createdAt: input.createdAt,
  });
  await setProjectGeometry(input.id, input.geometry);
  await setCompensationRate({
    state: input.state,
    district: input.district,
    ratePerHectare: input.rate.ratePerHectare,
    multiplier: input.rate.multiplier,
    setBy: "u-district-1",
  });

  const generated =
    input.parcelGenerator.kind === "corridor"
      ? generateCorridorParcels(input.geometry as LineGeometry, {
          rowWidthMeters: input.parcelGenerator.rowWidthMeters ?? 45,
          minSegmentMeters: 20,
          maxSegmentMeters: 80,
          villages: input.parcelGenerator.villages,
          seed: input.seed,
        })
      : generateGridParcels(input.geometry as PolygonGeometry, {
          targetParcelHectares: input.parcelGenerator.targetParcelHectares ?? 1.2,
          villages: input.parcelGenerator.villages,
          seed: input.seed,
        });

  const now = new Date();
  const rows = generated.map((p) => ({
    id: crypto.randomUUID(),
    projectId: input.id,
    village: p.village,
    areaHectares: p.areaHectares,
    status: input.parcelStatus,
    geometryGeoJson: JSON.stringify(p.geometry.coordinates),
    createdAt: now,
  }));
  await db.insert(parcels).values(rows);

  return rows.map((r) => ({ id: r.id, areaHectares: r.areaHectares }));
}

async function main() {
  for (const user of DEMO_USERS) {
    await db
      .insert(users)
      .values({
        id: user.id,
        name: user.name,
        role: user.role,
        district: user.district ?? null,
        state: user.state ?? null,
      })
      .onConflictDoNothing();
  }

  // --- Odisha: Koraput River Bridge Project (existing demo project, kept at DRAFT) ---
  {
    const projectId = "p-demo-bridge-1";
    const now = new Date();

    await db
      .insert(projects)
      .values({
        id: projectId,
        name: "Koraput River Bridge Project",
        purpose: "Construction of a 2-lane bridge connecting Koraput town to NH-26",
        state: "Odisha",
        district: "Koraput",
        stage: "DRAFT",
        createdBy: "u-agency-1",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    await db.insert(stageHistory).values({
      id: crypto.randomUUID(),
      projectId,
      fromStage: null,
      toStage: "DRAFT",
      action: "CREATE",
      actorId: "u-agency-1",
      actorRole: "agency",
      createdAt: now,
    });

    const dprContent = Buffer.from(
      "Detailed Project Report (demo)\nKoraput River Bridge Project\nPublic purpose: NH-26 connectivity.\n"
    );
    const { storagePath, sizeBytes } = await saveFile(dprContent, {
      projectId,
      category: "DPR",
      fileName: "koraput-bridge-dpr.txt",
    });
    await createDocument({
      projectId,
      category: "DPR",
      fileName: "koraput-bridge-dpr.txt",
      mimeType: "text/plain",
      sizeBytes,
      storagePath,
      uploadedBy: "u-agency-1",
    });

    const alignment: LineGeometry = {
      type: "LineString",
      coordinates: [
        [82.71, 18.81],
        [82.716, 18.816],
      ],
    };
    await setProjectGeometry(projectId, alignment);

    const generated = generateCorridorParcels(alignment, {
      rowWidthMeters: 45,
      minSegmentMeters: 20,
      maxSegmentMeters: 80,
      villages: ["Similiguda", "Kotpad"],
      seed: 0,
    });
    const parcelRows = generated.map((p) => ({
      id: crypto.randomUUID(),
      projectId,
      village: p.village,
      areaHectares: p.areaHectares,
      status: "NOTIFIED" as ParcelStatus,
      geometryGeoJson: JSON.stringify(p.geometry.coordinates),
      createdAt: now,
    }));
    await db.insert(parcels).values(parcelRows);

    await setCompensationRate({
      state: "Odisha",
      district: "Koraput",
      ratePerHectare: 1_500_000,
      multiplier: 1.5,
      setBy: "u-district-1",
    });
  }

  // --- Tamil Nadu: Chennai-Salem Green Corridor Expressway (Krishnagiri) ---
  // Breached: notified 14.5 months ago, never declared (12mo deadline).
  {
    const id = "p-tn-chennai-salem";
    await createSeedProject({
      id,
      name: "Chennai–Salem Green Corridor Expressway",
      purpose: "Access-controlled greenfield expressway corridor, Krishnagiri stretch",
      state: "Tamil Nadu",
      district: "Krishnagiri",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(15),
      geometry: { type: "LineString", coordinates: [[78.20, 12.52], [78.24, 12.56]] },
      parcelStatus: "NOTIFIED",
      parcelGenerator: { kind: "corridor", villages: ["Bargur", "Uthangarai"] },
      seed: 1,
      rate: { ratePerHectare: 1_200_000, multiplier: 2.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(15));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(14.7));
    await seedProjectTransition(id, "COMPLETE", "district", monthsAgo(14.5));
  }

  // --- Tamil Nadu: Chennai Metro Phase 2 - Poonamallee Extension ---
  // At-risk: awarded 2.5 months ago, only half of parcels paid (3mo deadline).
  {
    const id = "p-tn-chennai-metro";
    const notifiedAt = monthsAgo(5.6);
    const awardedAt = monthsAgo(2.5);
    const rate = { ratePerHectare: 8_000_000, multiplier: 1.0 };
    const parcelList = await createSeedProject({
      id,
      name: "Chennai Metro Phase 2 – Poonamallee Extension",
      purpose: "Elevated metro corridor extension, Poonamallee High Road",
      state: "Tamil Nadu",
      district: "Chennai",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(6),
      geometry: { type: "LineString", coordinates: [[80.08, 13.03], [80.13, 13.07]] },
      parcelStatus: "ACQUIRED",
      parcelGenerator: { kind: "corridor", villages: ["Poonamallee", "Thirumazhisai"] },
      seed: 2,
      rate,
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(6));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(5.8));
    await seedProjectTransition(id, "COMPLETE", "district", notifiedAt);
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(5.4));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(5.2));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(5.0));
    await seedProjectTransition(id, "PASS_AWARD", "district", awardedAt);
    await seedCompensationForParcels(
      parcelList,
      id,
      rate,
      notifiedAt,
      awardedAt,
      50_000,
      0.5,
      monthsAgo(2.0)
    );
  }

  // --- Tamil Nadu: Cauvery-Vaigai-Gundar Link Canal (Sivaganga Reach) ---
  // At-risk R&R (awarded 5mo ago, 6mo deadline, only reached SUBMITTED_TO_COLLECTOR).
  // Compensation on-track (fully paid within 0.2mo of award).
  {
    const id = "p-tn-cvg-canal";
    const notifiedAt = monthsAgo(9.6);
    const awardedAt = monthsAgo(5.0);
    const rate = { ratePerHectare: 900_000, multiplier: 2.5 };
    const parcelList = await createSeedProject({
      id,
      name: "Cauvery–Vaigai–Gundar Link Canal (Sivaganga Reach)",
      purpose: "Inter-basin link canal, Sivaganga command area",
      state: "Tamil Nadu",
      district: "Sivaganga",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(10),
      geometry: { type: "Polygon", coordinates: [[[78.47, 9.84], [78.47, 9.86], [78.50, 9.86], [78.50, 9.84], [78.47, 9.84]]] },
      parcelStatus: "ACQUIRED",
      parcelGenerator: { kind: "grid", villages: ["Manamadurai", "Ilayangudi"] },
      seed: 3,
      rate,
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(10));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(9.8));
    await seedProjectTransition(id, "COMPLETE", "district", notifiedAt);
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(9.4));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(9.2));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(9.0));
    await seedProjectTransition(id, "PASS_AWARD", "district", awardedAt);
    await seedCompensationForParcels(
      parcelList,
      id,
      rate,
      notifiedAt,
      awardedAt,
      25_000,
      1.0,
      monthsAgo(4.8)
    );
    await seedProjectTransition(id, "START_RR", "district", monthsAgo(4.9));
    await seedRRTransition(id, "COMPLETE_SURVEY", "district", monthsAgo(4.5));
    await seedRRTransition(id, "COMPLETE_SCHEME", "district", monthsAgo(3.5));
    await seedRRTransition(id, "COMPLETE_HEARING", "district", monthsAgo(2.5));
    await seedRRTransition(id, "SUBMIT_TO_COLLECTOR", "district", monthsAgo(1.5));
  }

  // --- Tamil Nadu: Ennore-Kattupalli Port Connectivity Corridor ---
  // Full success story: every deadline met with margin, all the way to RR_COMPLETE.
  {
    const id = "p-tn-ennore-kattupalli";
    const notifiedAt = monthsAgo(7.8);
    const awardedAt = monthsAgo(6.5);
    const rate = { ratePerHectare: 3_500_000, multiplier: 1.5 };
    const parcelList = await createSeedProject({
      id,
      name: "Ennore–Kattupalli Port Connectivity Corridor",
      purpose: "Port-linked freight corridor, Ennore to Kattupalli",
      state: "Tamil Nadu",
      district: "Thiruvallur",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(8),
      geometry: { type: "LineString", coordinates: [[80.30, 13.23], [80.35, 13.28]] },
      parcelStatus: "POSSESSED",
      parcelGenerator: { kind: "corridor", villages: ["Ennore", "Kattupalli"] },
      seed: 4,
      rate,
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(8));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(7.9));
    await seedProjectTransition(id, "COMPLETE", "district", notifiedAt);
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(7.6));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(7.4));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(7.2));
    await seedProjectTransition(id, "PASS_AWARD", "district", awardedAt);
    await seedCompensationForParcels(
      parcelList,
      id,
      rate,
      notifiedAt,
      awardedAt,
      40_000,
      1.0,
      monthsAgo(6.3)
    );
    await seedProjectTransition(id, "START_RR", "district", monthsAgo(6.4));
    await seedRRTransition(id, "COMPLETE_SURVEY", "district", monthsAgo(6.2));
    await seedRRTransition(id, "COMPLETE_SCHEME", "district", monthsAgo(5.8));
    await seedRRTransition(id, "COMPLETE_HEARING", "district", monthsAgo(5.4));
    await seedRRTransition(id, "SUBMIT_TO_COLLECTOR", "district", monthsAgo(5.0));
    await seedRRTransition(id, "APPROVE_RR_SCHEME", "state", monthsAgo(4.5));
    await seedRRTransition(id, "PASS_RR_AWARD", "district", monthsAgo(4.0));
    await seedProjectTransition(id, "COMPLETE_RR", "district", monthsAgo(3.5));
    await seedProjectTransition(id, "COMPLETE_INFRASTRUCTURE", "district", monthsAgo(1.0));
  }

  // --- Tamil Nadu: Coimbatore-Sathyamangalam NH Bypass ---
  // Too early: created 1 month ago, only reached SIA.
  {
    const id = "p-tn-coimbatore-bypass";
    await createSeedProject({
      id,
      name: "Coimbatore–Sathyamangalam NH Bypass",
      purpose: "National highway bypass corridor around Coimbatore",
      state: "Tamil Nadu",
      district: "Coimbatore",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(1.0),
      geometry: { type: "LineString", coordinates: [[76.96, 11.02], [77.05, 11.10]] },
      parcelStatus: "NOTIFIED",
      parcelGenerator: { kind: "corridor", villages: ["Annur", "Sathyamangalam"] },
      seed: 5,
      rate: { ratePerHectare: 2_000_000, multiplier: 2.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(1.0));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(0.9));
  }

  // --- Tamil Nadu: SIPCOT Industrial Corridor Expansion (Perambalur) ---
  // Breached: awarded 4 months ago, compensation assessed but never paid (3mo deadline).
  {
    const id = "p-tn-sipcot-perambalur";
    const notifiedAt = monthsAgo(6.1);
    const awardedAt = monthsAgo(4.0);
    const rate = { ratePerHectare: 1_000_000, multiplier: 2.0 };
    const parcelList = await createSeedProject({
      id,
      name: "SIPCOT Industrial Corridor Expansion – Perambalur",
      purpose: "Industrial corridor land pooling, SIPCOT Perambalur phase 2",
      state: "Tamil Nadu",
      district: "Perambalur",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(6.5),
      geometry: { type: "Polygon", coordinates: [[[78.87, 11.22], [78.87, 11.24], [78.90, 11.24], [78.90, 11.22], [78.87, 11.22]]] },
      parcelStatus: "ACQUIRED",
      parcelGenerator: { kind: "grid", villages: ["Perambalur Town", "Veppanthattai"] },
      seed: 6,
      rate,
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(6.5));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(6.3));
    await seedProjectTransition(id, "COMPLETE", "district", notifiedAt);
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(5.9));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(5.7));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(5.5));
    await seedProjectTransition(id, "PASS_AWARD", "district", awardedAt);
    await seedCompensationForParcels(
      parcelList,
      id,
      rate,
      notifiedAt,
      awardedAt,
      30_000,
      0,
      awardedAt
    );
  }

  // --- Karnataka: Bengaluru Peripheral Ring Road Corridor ---
  // On-track, early: notified 3 months ago, 12mo deadline.
  {
    const id = "p-ka-bengaluru-prr";
    await createSeedProject({
      id,
      name: "Bengaluru Peripheral Ring Road Corridor",
      purpose: "Peripheral ring road land acquisition, northern stretch",
      state: "Karnataka",
      district: "Bengaluru Urban",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(3.2),
      geometry: { type: "LineString", coordinates: [[77.55, 12.90], [77.65, 13.00]] },
      parcelStatus: "NOTIFIED",
      parcelGenerator: { kind: "corridor", villages: ["Hoskote", "Nelamangala"] },
      seed: 7,
      rate: { ratePerHectare: 6_000_000, multiplier: 1.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(3.2));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(3.1));
    await seedProjectTransition(id, "COMPLETE", "district", monthsAgo(3.0));
  }

  console.log("Seed complete: 6 demo users, 8 demo projects, realistic parcel-scale geometry.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
