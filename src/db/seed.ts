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
import { haversineDistanceMeters } from "@/lib/geo";
import type { ParcelStatus } from "@/lib/parcel-status";
import { sampleLinePoints, type ElevationSample } from "@/lib/elevation";
import { saveElevationProfile } from "./elevation";

/**
 * Fetches real elevation data for a linear alignment from Open-Elevation
 * (free, keyless, public SRTM-derived data) and stores it once at seed
 * time — the live app never depends on this API being reachable, only
 * this one-time seed run does. Network failures degrade gracefully
 * (elevation profile simply won't exist for that project) rather than
 * aborting the whole seed.
 */
async function seedElevationProfile(projectId: string, alignment: LineGeometry): Promise<void> {
  try {
    const points = sampleLinePoints(alignment, 20);
    const locations = points.map(([lng, lat]) => `${lat},${lng}`).join("|");
    const res = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`
    );
    if (!res.ok) throw new Error(`Open-Elevation returned ${res.status}`);
    const data = (await res.json()) as {
      results: { latitude: number; longitude: number; elevation: number }[];
    };

    let cumulative = 0;
    const samples: ElevationSample[] = points.map((p, i) => {
      if (i > 0) cumulative += haversineDistanceMeters(points[i - 1], p);
      return {
        distanceMeters: Math.round(cumulative),
        lng: p[0],
        lat: p[1],
        elevationMeters: data.results[i]?.elevation ?? 0,
      };
    });
    await saveElevationProfile(projectId, samples);
    console.log(`  elevation profile saved for ${projectId} (${samples.length} points)`);
  } catch (err) {
    console.warn(`  elevation profile skipped for ${projectId}: ${(err as Error).message}`);
  }
}

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

    // Real anchor: Koraput town centre is (82.6101, 18.7232) — this bridge
    // sits just southeast of town, on the way toward the real Kolab river
    // system, not ~12km off in an arbitrary direction.
    const alignment: LineGeometry = {
      type: "LineString",
      coordinates: [
        [82.61317, 18.72248],
        [82.6224, 18.72031],
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

    await seedElevationProfile(projectId, alignment);
  }

  // --- Tamil Nadu: Chennai-Salem Green Corridor Expressway (Krishnagiri) ---
  // Breached: notified 14.5 months ago, never declared (12mo deadline).
  {
    const id = "p-tn-chennai-salem";
    // Real waypoints: Bargur -> Uthangarai, Krishnagiri district (~33km,
    // gently curved as a greenfield expressway alignment would be).
    const alignment: LineGeometry = { type: "LineString", coordinates: [[78.3567, 12.5426], [78.43599, 12.41444], [78.4939, 12.2753]] };
    await createSeedProject({
      id,
      name: "Chennai–Salem Green Corridor Expressway",
      purpose: "Access-controlled greenfield expressway corridor, Krishnagiri stretch",
      state: "Tamil Nadu",
      district: "Krishnagiri",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(15),
      geometry: alignment,
      parcelStatus: "NOTIFIED",
      parcelGenerator: { kind: "corridor", villages: ["Bargur", "Uthangarai"] },
      seed: 1,
      rate: { ratePerHectare: 1_200_000, multiplier: 2.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(15));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(14.7));
    await seedProjectTransition(id, "COMPLETE", "district", monthsAgo(14.5));
    await seedElevationProfile(id, alignment);
  }

  // --- Tamil Nadu: Chennai Metro Phase 2 - Poonamallee Extension ---
  // At-risk: awarded 2.5 months ago, only half of parcels paid (3mo deadline).
  {
    const id = "p-tn-chennai-metro";
    const notifiedAt = monthsAgo(5.6);
    const awardedAt = monthsAgo(2.5);
    const rate = { ratePerHectare: 8_000_000, multiplier: 1.0 };
    // Real waypoints: Poonamallee -> Thirumazhisai along Poonamallee High
    // Road (~11.5km), bent to follow the actual road rather than a
    // diagonal line cutting across the city.
    const alignment: LineGeometry = { type: "LineString", coordinates: [[80.1602, 13.0341], [80.10752, 13.02914], [80.0608, 13.054]] };
    const parcelList = await createSeedProject({
      id,
      name: "Chennai Metro Phase 2 – Poonamallee Extension",
      purpose: "Elevated metro corridor extension, Poonamallee High Road",
      state: "Tamil Nadu",
      district: "Chennai",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(6),
      geometry: alignment,
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
    await seedElevationProfile(id, alignment);
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
      // Real axis: Manamadurai -> Ilayangudi, Sivaganga district (~7.1km
      // reach incl. buffer, 900m acquisition width) — an elongated
      // footprint along the two real villages it names, not an arbitrary
      // box.
      geometry: { type: "Polygon", coordinates: [[[78.49303, 9.88978], [78.48484, 9.88919], [78.48957, 9.82552], [78.49776, 9.82611], [78.49303, 9.88978]]] },
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
    // Real waypoints: Ennore -> Kattupalli along the north Chennai coast
    // (~10km), gently curved to follow the coastline.
    const alignment: LineGeometry = {
      type: "LineString",
      coordinates: [[80.3244, 13.2258], [80.32613, 13.27097], [80.3451, 13.312]],
    };
    const parcelList = await createSeedProject({
      id,
      name: "Ennore–Kattupalli Port Connectivity Corridor",
      purpose: "Port-linked freight corridor, Ennore to Kattupalli",
      state: "Tamil Nadu",
      district: "Thiruvallur",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(8),
      geometry: alignment,
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
    await seedElevationProfile(id, alignment);
  }

  // --- Tamil Nadu: Coimbatore-Sathyamangalam NH Bypass ---
  // Too early: created 1 month ago, only reached SIA.
  {
    const id = "p-tn-coimbatore-bypass";
    // Real waypoints: Coimbatore -> Annur -> Sathyamangalam (~70km,
    // curving near the Sathyamangalam Tiger Reserve foothills — this is
    // a real NH corridor scale, not a short arbitrary line).
    const alignment: LineGeometry = {
      type: "LineString",
      coordinates: [[76.9628, 11.0018], [77.01928, 11.12584], [77.1035, 11.233], [77.1589, 11.40565], [77.2654, 11.5524]],
    };
    await createSeedProject({
      id,
      name: "Coimbatore–Sathyamangalam NH Bypass",
      purpose: "National highway bypass corridor around Coimbatore",
      state: "Tamil Nadu",
      district: "Coimbatore",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(1.0),
      geometry: alignment,
      parcelStatus: "NOTIFIED",
      parcelGenerator: { kind: "corridor", villages: ["Annur", "Sathyamangalam"] },
      seed: 5,
      rate: { ratePerHectare: 2_000_000, multiplier: 2.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(1.0));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(0.9));
    await seedElevationProfile(id, alignment);
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
      // Real axis: Perambalur -> Veppanthattai (~14km incl. buffer,
      // 1.2km acquisition width) — an elongated footprint along the two
      // real towns it names.
      geometry: { type: "Polygon", coordinates: [[[78.92653, 11.28416], [78.93678, 11.28806], [78.89037, 11.40554], [78.88012, 11.40164], [78.92653, 11.28416]]] },
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
    // Real waypoints: Hoskote -> Nelamangala, arced north of Bengaluru's
    // city center at a roughly constant peripheral radius (~56km) — an
    // actual ring-shaped curve, not a straight diagonal line.
    const alignment: LineGeometry = {
      type: "LineString",
      coordinates: [
        [77.7619, 13.0318],
        [77.75741, 13.07523],
        [77.74037, 13.11849],
        [77.71049, 13.1574],
        [77.6692, 13.18774],
        [77.61956, 13.20601],
        [77.5658, 13.21009],
        [77.5126, 13.19953],
        [77.4643, 13.17555],
        [77.42429, 13.14064],
        [77.3946, 13.098],
      ],
    };
    await createSeedProject({
      id,
      name: "Bengaluru Peripheral Ring Road Corridor",
      purpose: "Peripheral ring road land acquisition, northern stretch",
      state: "Karnataka",
      district: "Bengaluru Urban",
      createdBy: "u-agency-1",
      createdAt: monthsAgo(3.2),
      geometry: alignment,
      parcelStatus: "NOTIFIED",
      parcelGenerator: { kind: "corridor", villages: ["Hoskote", "Nelamangala"] },
      seed: 7,
      rate: { ratePerHectare: 6_000_000, multiplier: 1.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(3.2));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(3.1));
    await seedProjectTransition(id, "COMPLETE", "district", monthsAgo(3.0));
    await seedElevationProfile(id, alignment);
  }

  console.log("Seed complete: 6 demo users, 8 demo projects, realistic parcel-scale geometry.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
