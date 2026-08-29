import { db } from "./client";
import { eq } from "drizzle-orm";
import { users, projects, stageHistory, rrStageHistory, compensations } from "./schema";
import { DEMO_USERS } from "./seed-data";
import { saveFile } from "@/lib/storage";
import { createDocument } from "./documents";
import { setProjectGeometry } from "./projects";
import { createParcel } from "./parcels";
import { setCompensationRate } from "./compensation";
import { getProject } from "./projects";
import { transitionProject, type Action, type Role, type Stage } from "@/lib/workflow";
import { transitionRR, type RRAction, type RRStage } from "@/lib/rr-workflow";
import { calculateCompensation } from "@/lib/compensation";
import type { Geometry, PolygonGeometry } from "@/lib/geo";
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

async function seedCompensation(
  parcelId: string,
  projectId: string,
  areaHectares: number,
  rate: { ratePerHectare: number; multiplier: number },
  notifiedAt: Date,
  awardedAt: Date,
  assetsValue: number,
  paidAt: Date | null
): Promise<void> {
  const breakdown = calculateCompensation({
    areaHectares,
    ratePerHectare: rate.ratePerHectare,
    multiplier: rate.multiplier,
    assetsValue,
    sIANotificationDate: notifiedAt,
    awardDate: awardedAt,
  });
  await db.insert(compensations).values({
    id: crypto.randomUUID(),
    parcelId,
    projectId,
    ratePerHectare: rate.ratePerHectare,
    multiplier: rate.multiplier,
    assetsValue: breakdown.assetsValue,
    marketValue: breakdown.marketValue,
    multipliedMarketValue: breakdown.multipliedMarketValue,
    solatium: breakdown.solatium,
    interest: breakdown.interest,
    total: breakdown.total,
    status: paidAt ? "PAID" : "ASSESSED",
    assessedBy: SEED_ACTOR_IDS.district,
    assessedAt: awardedAt,
    paidAt,
  });
}

interface SeedProjectInput {
  id: string;
  name: string;
  purpose: string;
  state: string;
  district: string;
  createdBy: string;
  createdAt: Date;
  geometry: Geometry;
  parcels: Array<{ village: string; areaHectares: number; status: ParcelStatus; geometry: PolygonGeometry }>;
  rate: { ratePerHectare: number; multiplier: number };
}

async function createSeedProject(input: SeedProjectInput): Promise<string[]> {
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
  const parcelIds: string[] = [];
  for (const p of input.parcels) {
    parcelIds.push(await createParcel({ projectId: input.id, ...p }));
  }
  return parcelIds;
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

  const now = new Date();
  const projectId = "p-demo-bridge-1";

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

  await setProjectGeometry(projectId, {
    type: "LineString",
    coordinates: [
      [82.71, 18.81],
      [82.716, 18.816],
    ],
  });

  const demoParcels: Array<{
    village: string;
    areaHectares: number;
    status: ParcelStatus;
    geometry: PolygonGeometry;
  }> = [
    {
      village: "Similiguda",
      areaHectares: 1.2,
      status: "NOTIFIED",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [82.7115, 18.8125],
            [82.7115, 18.8135],
            [82.7125, 18.8135],
            [82.7125, 18.8125],
            [82.7115, 18.8125],
          ],
        ],
      },
    },
    {
      village: "Kotpad",
      areaHectares: 0.8,
      status: "ACQUIRED",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [82.7135, 18.8145],
            [82.7135, 18.8155],
            [82.7145, 18.8155],
            [82.7145, 18.8145],
            [82.7135, 18.8145],
          ],
        ],
      },
    },
    {
      village: "Boriguma",
      areaHectares: 2.1,
      status: "NOTIFIED",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [82.76, 18.83],
            [82.76, 18.831],
            [82.761, 18.831],
            [82.761, 18.83],
            [82.76, 18.83],
          ],
        ],
      },
    },
  ];
  for (const p of demoParcels) {
    await createParcel({ projectId, ...p });
  }

  await setCompensationRate({
    state: "Odisha",
    district: "Koraput",
    ratePerHectare: 1_500_000,
    multiplier: 1.5,
    setBy: "u-district-1",
  });

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
      parcels: [
        { village: "Bargur", areaHectares: 3.4, status: "NOTIFIED", geometry: { type: "Polygon", coordinates: [[[78.205, 12.525], [78.205, 12.53], [78.21, 12.53], [78.21, 12.525], [78.205, 12.525]]] } },
        { village: "Uthangarai", areaHectares: 2.1, status: "NOTIFIED", geometry: { type: "Polygon", coordinates: [[[78.225, 12.545], [78.225, 12.55], [78.23, 12.55], [78.23, 12.545], [78.225, 12.545]]] } },
      ],
      rate: { ratePerHectare: 1_200_000, multiplier: 2.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(15));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(14.7));
    await seedProjectTransition(id, "COMPLETE", "district", monthsAgo(14.5));
  }

  // --- Tamil Nadu: Chennai Metro Phase 2 - Poonamallee Extension ---
  // At-risk: awarded 2.5 months ago, only 1 of 2 parcels paid (3mo deadline).
  {
    const id = "p-tn-chennai-metro";
    const notifiedAt = monthsAgo(5.6);
    const awardedAt = monthsAgo(2.5);
    const rate = { ratePerHectare: 8_000_000, multiplier: 1.0 };
    const parcelIds = await createSeedProject({
      id,
      name: "Chennai Metro Phase 2 – Poonamallee Extension",
      purpose: "Elevated metro corridor extension, Poonamallee High Road",
      state: "Tamil Nadu",
      district: "Chennai",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(6),
      geometry: { type: "LineString", coordinates: [[80.08, 13.03], [80.13, 13.07]] },
      parcels: [
        { village: "Poonamallee", areaHectares: 0.6, status: "ACQUIRED", geometry: { type: "Polygon", coordinates: [[[80.09, 13.04], [80.09, 13.045], [80.095, 13.045], [80.095, 13.04], [80.09, 13.04]]] } },
        { village: "Thirumazhisai", areaHectares: 0.4, status: "ACQUIRED", geometry: { type: "Polygon", coordinates: [[[80.11, 13.055], [80.11, 13.06], [80.115, 13.06], [80.115, 13.055], [80.11, 13.055]]] } },
      ],
      rate,
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(6));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(5.8));
    await seedProjectTransition(id, "COMPLETE", "district", notifiedAt);
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(5.4));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(5.2));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(5.0));
    await seedProjectTransition(id, "PASS_AWARD", "district", awardedAt);
    await seedCompensation(parcelIds[0], id, 0.6, rate, notifiedAt, awardedAt, 50_000, monthsAgo(2.0));
    await seedCompensation(parcelIds[1], id, 0.4, rate, notifiedAt, awardedAt, 50_000, null);
  }

  // --- Tamil Nadu: Cauvery-Vaigai-Gundar Link Canal (Sivaganga Reach) ---
  // At-risk R&R (awarded 5mo ago, 6mo deadline, only reached SUBMITTED_TO_COLLECTOR).
  // Compensation on-track (fully paid within 0.2mo of award).
  {
    const id = "p-tn-cvg-canal";
    const notifiedAt = monthsAgo(9.6);
    const awardedAt = monthsAgo(5.0);
    const rate = { ratePerHectare: 900_000, multiplier: 2.5 };
    const parcelIds = await createSeedProject({
      id,
      name: "Cauvery–Vaigai–Gundar Link Canal (Sivaganga Reach)",
      purpose: "Inter-basin link canal, Sivaganga command area",
      state: "Tamil Nadu",
      district: "Sivaganga",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(10),
      geometry: { type: "Polygon", coordinates: [[[78.47, 9.84], [78.47, 9.86], [78.50, 9.86], [78.50, 9.84], [78.47, 9.84]]] },
      parcels: [
        { village: "Manamadurai", areaHectares: 4.2, status: "ACQUIRED", geometry: { type: "Polygon", coordinates: [[[78.475, 9.845], [78.475, 9.85], [78.48, 9.85], [78.48, 9.845], [78.475, 9.845]]] } },
        { village: "Ilayangudi", areaHectares: 3.1, status: "ACQUIRED", geometry: { type: "Polygon", coordinates: [[[78.49, 9.855], [78.49, 9.858], [78.495, 9.858], [78.495, 9.855], [78.49, 9.855]]] } },
      ],
      rate,
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(10));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(9.8));
    await seedProjectTransition(id, "COMPLETE", "district", notifiedAt);
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(9.4));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(9.2));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(9.0));
    await seedProjectTransition(id, "PASS_AWARD", "district", awardedAt);
    await seedCompensation(parcelIds[0], id, 4.2, rate, notifiedAt, awardedAt, 100_000, monthsAgo(4.8));
    await seedCompensation(parcelIds[1], id, 3.1, rate, notifiedAt, awardedAt, 100_000, monthsAgo(4.8));
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
    const parcelIds = await createSeedProject({
      id,
      name: "Ennore–Kattupalli Port Connectivity Corridor",
      purpose: "Port-linked freight corridor, Ennore to Kattupalli",
      state: "Tamil Nadu",
      district: "Thiruvallur",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(8),
      geometry: { type: "LineString", coordinates: [[80.30, 13.23], [80.35, 13.28]] },
      parcels: [
        { village: "Ennore", areaHectares: 1.8, status: "POSSESSED", geometry: { type: "Polygon", coordinates: [[[80.31, 13.24], [80.31, 13.245], [80.315, 13.245], [80.315, 13.24], [80.31, 13.24]]] } },
        { village: "Kattupalli", areaHectares: 2.4, status: "POSSESSED", geometry: { type: "Polygon", coordinates: [[[80.335, 13.265], [80.335, 13.27], [80.34, 13.27], [80.34, 13.265], [80.335, 13.265]]] } },
      ],
      rate,
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(8));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(7.9));
    await seedProjectTransition(id, "COMPLETE", "district", notifiedAt);
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(7.6));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(7.4));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(7.2));
    await seedProjectTransition(id, "PASS_AWARD", "district", awardedAt);
    await seedCompensation(parcelIds[0], id, 1.8, rate, notifiedAt, awardedAt, 80_000, monthsAgo(6.3));
    await seedCompensation(parcelIds[1], id, 2.4, rate, notifiedAt, awardedAt, 80_000, monthsAgo(6.3));
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
      parcels: [
        { village: "Annur", areaHectares: 1.6, status: "NOTIFIED", geometry: { type: "Polygon", coordinates: [[[76.98, 11.04], [76.98, 11.045], [76.985, 11.045], [76.985, 11.04], [76.98, 11.04]]] } },
      ],
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
    const parcelIds = await createSeedProject({
      id,
      name: "SIPCOT Industrial Corridor Expansion – Perambalur",
      purpose: "Industrial corridor land pooling, SIPCOT Perambalur phase 2",
      state: "Tamil Nadu",
      district: "Perambalur",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(6.5),
      geometry: { type: "Polygon", coordinates: [[[78.87, 11.22], [78.87, 11.24], [78.90, 11.24], [78.90, 11.22], [78.87, 11.22]]] },
      parcels: [
        { village: "Perambalur Town", areaHectares: 5.0, status: "ACQUIRED", geometry: { type: "Polygon", coordinates: [[[78.875, 11.225], [78.875, 11.23], [78.88, 11.23], [78.88, 11.225], [78.875, 11.225]]] } },
        { village: "Veppanthattai", areaHectares: 3.2, status: "ACQUIRED", geometry: { type: "Polygon", coordinates: [[[78.89, 11.235], [78.89, 11.238], [78.895, 11.238], [78.895, 11.235], [78.89, 11.235]]] } },
      ],
      rate,
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(6.5));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(6.3));
    await seedProjectTransition(id, "COMPLETE", "district", notifiedAt);
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(5.9));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(5.7));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(5.5));
    await seedProjectTransition(id, "PASS_AWARD", "district", awardedAt);
    await seedCompensation(parcelIds[0], id, 5.0, rate, notifiedAt, awardedAt, 120_000, null);
    await seedCompensation(parcelIds[1], id, 3.2, rate, notifiedAt, awardedAt, 120_000, null);
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
      parcels: [
        { village: "Hoskote", areaHectares: 2.8, status: "NOTIFIED", geometry: { type: "Polygon", coordinates: [[[77.57, 12.92], [77.57, 12.925], [77.575, 12.925], [77.575, 12.92], [77.57, 12.92]]] } },
        { village: "Nelamangala", areaHectares: 1.9, status: "NOTIFIED", geometry: { type: "Polygon", coordinates: [[[77.62, 12.97], [77.62, 12.975], [77.625, 12.975], [77.625, 12.97], [77.62, 12.97]]] } },
      ],
      rate: { ratePerHectare: 6_000_000, multiplier: 1.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(3.2));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(3.1));
    await seedProjectTransition(id, "COMPLETE", "district", monthsAgo(3.0));
  }

  console.log("Seed complete: 6 demo users, 8 demo projects.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
