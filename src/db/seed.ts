import { db } from "./client";
import { eq } from "drizzle-orm";
import {
  users, projects, stageHistory, rrStageHistory, compensations, parcels,
  families, entitlements, heirs, grievances, documents,
  infrastructureItems, gramSabhaConsultations, legalDisputes, contractors,
  tenders, landBankEntries, rehabilitationServices, notificationLog,
  noticeDrafts, projectRequests, compensationRates, conflictDismissals,
  elevationProfiles,
} from "./schema";
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
import { surveyNumberFor, pattaNumberFor } from "@/lib/land-records";
import { ENTITLEMENT_TYPES } from "@/lib/entitlements";
import type { DocumentCategory } from "@/lib/document-categories";

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
      `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`,
      { signal: AbortSignal.timeout(2000) }
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

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
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
  projectId: string;
  areaHectares: number;
  village: string;
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
  const villageCounters = new Map<string, number>();
  const rows = generated.map((p, globalIndex) => {
    const villageIndex = villageCounters.get(p.village) ?? 0;
    villageCounters.set(p.village, villageIndex + 1);
    return {
      id: crypto.randomUUID(),
      projectId: input.id,
      village: p.village,
      areaHectares: p.areaHectares,
      status: input.parcelStatus,
      geometryGeoJson: JSON.stringify(p.geometry.coordinates),
      createdAt: now,
      surveyNumber: surveyNumberFor(villageIndex),
      pattaNumber: pattaNumberFor(input.district, globalIndex),
    };
  });
  await db.insert(parcels).values(rows);

  return rows.map((r) => ({
    id: r.id,
    projectId: input.id,
    areaHectares: r.areaHectares,
    village: generated.find((g) => JSON.stringify(g.geometry.coordinates) === r.geometryGeoJson)?.village ?? input.parcelGenerator.villages[0],
  }));
}

// ── Tamil Nadu family name pools ──
const TN_MALE_NAMES = [
  "Murugan", "Senthil", "Rajendran", "Balakrishnan", "Saravanan", "Arunachalam",
  "Palani", "Velusamy", "Gurunathan", "Subramanian", "Manikandan", "Shanmugam",
  "Thirunavukkarasu", "Periyasamy", "Kuppusamy", "Ramamurthy", "Govindaraj",
  "Dhandapani", "Chelladurai", "Muthusamy", "Karuppan", "Nagaraj", "Arumugam",
  "Ranganathan", "Ganesan", "Vijayan", "Krishnan", "Anbalagan", "Thangavel",
  "Muthukumar",
];
const TN_FEMALE_NAMES = [
  "Lakshmi", "Meenakshi", "Parvathi", "Selvi", "Amudha", "Kamatchi",
  "Vasanthi", "Usha", "Malliga", "Rani", "Chitra", "Revathi",
  "Ponni", "Thangamani", "Nagammal", "Gandhimathi", "Kalpana", "Saroja",
];
const ODISHA_NAMES = [
  "Biswajit Mohanty", "Laxmi Priya Sahu", "Gokulananda Panda", "Sushama Das",
  "Prashant Behera", "Annapurna Mishra", "Debashish Nayak", "Madhusmita Satpathy",
];
const KARNATAKA_NAMES = [
  "Basavaraj Patil", "Rekha Gowda", "Shivaraj Hegde", "Malathi Shastry",
  "Ramachandra Rao", "Gangamma Devi", "Siddalingappa", "Nagaratna",
];

function pickName(pool: string[], index: number): string {
  return pool[index % pool.length];
}

// ── Grievance description templates ──
const GRIEVANCE_TEMPLATES = [
  { type: "COMPENSATION_AMOUNT", desc: "Market rate used for compensation is below fair value; registered sale deeds in the vicinity show significantly higher rates." },
  { type: "COMPENSATION_AMOUNT", desc: "Assets value (structures, trees) grossly underestimated; independent valuation attached." },
  { type: "DELAYED_PAYMENT", desc: "Award passed %MONTHS% months ago but no compensation disbursed yet; family facing financial hardship." },
  { type: "SURVEY_ERROR", desc: "Survey measurement shows parcel as %AREA% ha but revenue records indicate a larger extent; boundary markers misplaced." },
  { type: "RR_ENTITLEMENT", desc: "Family classified as landowner but dependent members qualify as livelihood losers — requesting additional R&R entitlement." },
  { type: "RR_ENTITLEMENT", desc: "Vulnerable group status (SC/ST) not reflected in entitlement calculation despite documentary proof submitted." },
  { type: "BOUNDARY_DISPUTE", desc: "Adjoining landowner claims the notified boundary encroaches on their survey number; requesting joint survey." },
  { type: "POSSESSION_DELAY", desc: "Possession taken without proper notice; standing crops destroyed before harvest — seeking additional compensation." },
  { type: "DOCUMENTATION", desc: "Notice received names wrong patta holder; actual owner name differs from notified name." },
  { type: "COMPENSATION_AMOUNT", desc: "Solatium calculation appears incorrect — not the statutory 100% mandated under Section 30(1)." },
];

// ── Document templates ──
const DOC_CATEGORIES = ["DPR", "SECTION_11_NOTICE", "SECTION_19_DECLARATION", "SECTION_23_AWARD", "POSSESSION_CERTIFICATE", "SIA_REPORT", "RR_SCHEME", "GRAM_SABHA_MINUTES"];

function docFileName(category: string, projectName: string, index: number): string {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  return `${category.toLowerCase()}-${slug}-${index + 1}.txt`;
}

function docContent(category: string, projectName: string): string {
  switch (category) {
    case "DPR": return `Detailed Project Report\n${projectName}\nPrepared under Section 4(1) of RFCTLARR Act, 2013.\n`;
    case "SECTION_11_NOTICE": return `Section 11 Notification\nPreliminary notification for ${projectName}.\nAll affected parties may file objections within 60 days.\n`;
    case "SECTION_19_DECLARATION": return `Section 19 Declaration\nDeclaration of acquisition for ${projectName}.\nThe land described herein is required for public purpose.\n`;
    case "SECTION_23_AWARD": return `Section 23 Award\nCompensation award for ${projectName}.\nAmount determined per market value + solatium + interest.\n`;
    case "POSSESSION_CERTIFICATE": return `Possession Certificate\nCertification that physical possession of the notified land for ${projectName} has been taken.\n`;
    case "SIA_REPORT": return `Social Impact Assessment Report\n${projectName}\nPrepared by the appointed independent assessor under Section 4.\n`;
    case "RR_SCHEME": return `Resettlement & Rehabilitation Scheme\n${projectName}\nComprehensive R&R plan covering all affected families.\n`;
    case "GRAM_SABHA_MINUTES": return `Gram Sabha Consultation Minutes\n${projectName}\nRecord of consultation held with affected villages.\n`;
    case "SURVEY_MAP": return `Cadastral Survey Map\n${projectName}\nVillage-level boundary survey map showing acquired parcels.\n`;
    case "VALUATION_REPORT": return `Land & Asset Valuation Report\n${projectName}\nValuation assessment prepared by competent authority.\n`;
    default: return `Document for ${projectName}\n`;
  }
}

// ── Infrastructure items ──
const INFRA_ITEMS = [
  "Access road construction", "Water supply pipeline", "Power line relocation",
  "Community center", "Primary school", "Health sub-center",
  "Drainage system", "Street lighting", "Bus stop shelter",
  "Common grazing ground fencing",
];

// ── Gram Sabha resolution templates ──
const GS_RESOLUTIONS = [
  "Resolved unanimously: the project alignment is accepted subject to adequate compensation at fair market value.",
  "Resolved by majority: concerns raised regarding displacement of temple and burial ground — requesting alignment modification.",
  "Resolved unanimously: community requests construction of replacement access road before possession of existing road parcels.",
  "Resolved by majority: families agree to relocation on condition that resettlement colony has school and health center within 2km.",
  "Resolved unanimously: request to increase subsistence grant duration from 12 to 18 months given agricultural dependence.",
];

// ── Seeded data tracking ──
const allSeededFamilyIds: { id: string; projectId: string; village: string }[] = [];
const allSeededParcelIds: { id: string; projectId: string; village: string; areaHectares: number }[] = [];

/**
 * Seeds families for a project, linking them to parcels where available.
 * Creates 10–20 families per project with varied categories and entitlement states.
 * Returns the list of created family IDs.
 */
async function seedFamiliesForProject(
  projectId: string,
  projectParcels: SeededParcel[],
  villages: string[],
  state: string,
  count: number,
  seedOffset: number,
): Promise<string[]> {
  const namePool = state === "Odisha" ? ODISHA_NAMES
    : state === "Karnataka" ? KARNATAKA_NAMES
    : [...TN_MALE_NAMES, ...TN_FEMALE_NAMES];
  const categories = ["landowner", "livelihood-loser", "tenant"];
  const familyIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const familyId = crypto.randomUUID();
    const village = villages[i % villages.length];
    const parcel = projectParcels[i % projectParcels.length];
    const category = categories[i % categories.length];
    const isVulnerable = i % 7 === 0; // ~14% vulnerable
    const memberCount = 2 + (i % 6); // 2-7 members
    const name = pickName(namePool, seedOffset + i);

    await db.insert(families).values({
      id: familyId,
      projectId,
      parcelId: parcel?.id ?? null,
      headOfHouseholdName: name,
      village,
      category,
      memberCount,
      vulnerableGroup: isVulnerable,
      contactPhone: `98${String(4200000 + seedOffset * 100 + i).padStart(8, "0")}`,
      surveyedBy: "u-field-1",
      surveyedAt: monthsAgo(3 + (i % 5)),
      deceasedAt: null,
      successionNote: null,
    });

    // Create entitlements for each family
    const entitlementRows = ENTITLEMENT_TYPES.map((type) => ({
      id: crypto.randomUUID(),
      familyId,
      type,
      status: "PENDING" as const,
      amount: null as number | null,
      grantedBy: null as string | null,
      grantedAt: null as Date | null,
      note: null as string | null,
    }));
    await db.insert(entitlements).values(entitlementRows);

    // Grant ~40% of entitlements
    if (i % 5 < 2) {
      for (const ent of entitlementRows) {
        const amount = ent.type === "HOUSING_OR_LAND" ? 250000 + (i * 10000)
          : ent.type === "SUBSISTENCE_GRANT" ? 36000
          : ent.type === "TRANSPORT_ALLOWANCE" ? 5000
          : ent.type === "ARTISAN_TRADER_GRANT" ? 25000
          : ent.type === "RESETTLEMENT_ALLOWANCE" ? 50000
          : 0;
        await db.update(entitlements)
          .set({ status: "GRANTED", amount, grantedBy: "u-district-1", grantedAt: monthsAgo(1 + (i % 3)), note: "Verified and granted per R&R scheme" })
          .where(eq(entitlements.id, ent.id));
      }
    }

    familyIds.push(familyId);
    allSeededFamilyIds.push({ id: familyId, projectId, village });
  }

  return familyIds;
}

/**
 * Seeds heirs for deceased family heads — ~1 in 15 families.
 */
async function seedHeirsForFamilies(familyIds: string[], projectId: string): Promise<void> {
  const heirNames = ["Arjun", "Kavitha", "Dinesh", "Priya", "Ravi", "Meena", "Suresh", "Lakshmi"];
  const relationships = ["son", "daughter", "spouse", "son", "daughter"];
  let heirCount = 0;

  for (let i = 0; i < familyIds.length; i++) {
    if (i % 15 !== 3) continue; // ~1 in 15
    const fid = familyIds[i];

    // Mark family head as deceased
    await db.update(families)
      .set({ deceasedAt: monthsAgo(2), successionNote: "Head of household deceased; entitlements split among legal heirs." })
      .where(eq(families.id, fid));

    // Create 2-3 heirs
    const numHeirs = 2 + (i % 2);
    const shares = numHeirs === 2 ? [50, 50] : [40, 30, 30];
    for (let h = 0; h < numHeirs; h++) {
      await db.insert(heirs).values({
        id: crypto.randomUUID(),
        familyId: fid,
        name: heirNames[(heirCount + h) % heirNames.length],
        relationship: relationships[(heirCount + h) % relationships.length],
        sharePercent: shares[h],
        contactPhone: `97${String(5500000 + heirCount + h).padStart(8, "0")}`,
        createdAt: monthsAgo(1.5),
      });
    }
    heirCount += numHeirs;
  }
  console.log(`  ${heirCount} heirs seeded for ${projectId}`);
}

/**
 * Seeds grievances for a project.
 */
async function seedGrievancesForProject(
  projectId: string,
  villages: string[],
  count: number,
  seedOffset: number,
): Promise<void> {
  const statuses = ["FILED", "ASSIGNED", "UNDER_REVIEW", "RESOLVED", "DISMISSED"];
  for (let i = 0; i < count; i++) {
    const template = GRIEVANCE_TEMPLATES[(seedOffset + i) % GRIEVANCE_TEMPLATES.length];
    const status = statuses[i % statuses.length];
    const village = villages[i % villages.length];
    const trackingNo = `GRV-${String(2026)}-${String(seedOffset * 100 + i + 1).padStart(5, "0")}`;
    const desc = template.desc
      .replace("%MONTHS%", String(3 + (i % 4)))
      .replace("%AREA%", String((0.5 + i * 0.1).toFixed(2)));

    await db.insert(grievances).values({
      id: crypto.randomUUID(),
      trackingNumber: trackingNo,
      type: template.type,
      projectId,
      compensationId: null,
      submitterName: pickName(TN_MALE_NAMES, seedOffset + i),
      submitterContact: `94${String(4300000 + seedOffset * 10 + i).padStart(8, "0")}`,
      description: `[${village}] ${desc}`,
      attachmentFileName: null,
      attachmentStoragePath: null,
      status,
      resolution: status === "RESOLVED" ? "Compensation amount revised after re-assessment." : status === "DISMISSED" ? "Claim not substantiated on verification." : null,
      resolutionNote: status === "RESOLVED" ? "Re-assessed and approved by Collector" : status === "DISMISSED" ? "Field verification found no merit" : null,
      resolvedBy: status === "RESOLVED" || status === "DISMISSED" ? "u-district-1" : null,
      resolvedAt: status === "RESOLVED" || status === "DISMISSED" ? monthsAgo(0.5) : null,
      createdAt: monthsAgo(2 + (i % 4)),
    });
  }
}

/**
 * Seeds documents (Section 11 notices, DPRs, etc.) for a project.
 */
function toDocCategory(cat: string): DocumentCategory {
  switch (cat) {
    case "DPR": return "DPR";
    case "SECTION_11_NOTICE": return "NOTIFICATION";
    case "SECTION_19_DECLARATION": return "DECLARATION";
    case "SECTION_23_AWARD": return "AWARD_LETTER";
    case "POSSESSION_CERTIFICATE": return "POSSESSION_CERTIFICATE";
    case "SIA_REPORT": return "SIA_REPORT";
    case "SURVEY_MAP": return "ROW_PLAN";
    case "VALUATION_REPORT": return "SITE_INVESTIGATION";
    case "DESIGN_DRAWING": return "DESIGN_DRAWING";
    default: return "OTHER";
  }
}

async function seedDocumentsForProject(
  projectId: string,
  projectName: string,
  categories: string[],
): Promise<void> {
  const allCategories = [...categories, "SURVEY_MAP", "VALUATION_REPORT"];
  for (let i = 0; i < allCategories.length; i++) {
    const cat = allCategories[i];
    const content = Buffer.from(docContent(cat, projectName));
    const fname = docFileName(cat, projectName, i);
    const { storagePath, sizeBytes } = await saveFile(content, {
      projectId,
      category: cat,
      fileName: fname,
    });
    await createDocument({
      projectId,
      category: toDocCategory(cat),
      fileName: fname,
      mimeType: "text/plain",
      sizeBytes,
      storagePath,
      uploadedBy: "u-agency-1",
    });
  }
}

/**
 * Seeds infrastructure items for a project.
 */
async function seedInfraForProject(
  projectId: string,
  count: number,
  completedFraction: number,
): Promise<void> {
  const completedCount = Math.round(count * completedFraction);
  for (let i = 0; i < count; i++) {
    const item = INFRA_ITEMS[i % INFRA_ITEMS.length];
    const isComplete = i < completedCount;
    await db.insert(infrastructureItems).values({
      id: crypto.randomUUID(),
      projectId,
      item,
      status: isComplete ? "COMPLETE" : i < completedCount + 2 ? "IN_PROGRESS" : "PENDING",
      completedBy: isComplete ? "u-district-1" : null,
      completedAt: isComplete ? monthsAgo(1 + (i % 3)) : null,
    });
  }
}

/**
 * Seeds gram sabha consultations for a project.
 */
async function seedGramSabhaForProject(
  projectId: string,
  villages: string[],
  count: number,
): Promise<void> {
  for (let i = 0; i < count; i++) {
    await db.insert(gramSabhaConsultations).values({
      id: crypto.randomUUID(),
      projectId,
      village: villages[i % villages.length],
      consultationDate: monthsAgo(6 + i * 2),
      attendanceCount: 45 + (i * 12) % 80,
      minutes: `Consultation ${i + 1} for the project. Discussed land acquisition process, compensation rates, and resettlement plan. ${45 + (i * 12) % 80} attendees recorded.`,
      resolution: GS_RESOLUTIONS[i % GS_RESOLUTIONS.length],
      recordedBy: "u-district-1",
      createdAt: monthsAgo(6 + i * 2),
    });
  }
}

/**
 * Seeds notification log entries for a project's families.
 */
async function seedNotificationsForFamilies(
  familyIds: string[],
  projectId: string,
  channelsPerFamily: number,
): Promise<void> {
  const channels = ["SMS", "VOICE", "POST", "EMAIL"];
  const statuses = ["SENT", "DELIVERED", "DELIVERED", "FAILED"]; // mostly delivered
  for (let i = 0; i < familyIds.length; i++) {
    for (let c = 0; c < channelsPerFamily && c < channels.length; c++) {
      const channel = channels[c];
      await db.insert(notificationLog).values({
        id: crypto.randomUUID(),
        familyId: familyIds[i],
        projectId,
        channel,
        status: statuses[c],
        postalTrackingId: channel === "POST" ? `IN${String(8900000 + i).padStart(9, "0")}` : null,
        postalDocumentId: null,
        note: channel === "FAILED" ? "Number unreachable" : null,
        sentBy: "u-district-1",
        sentAt: monthsAgo(2 + (i % 3)),
        updatedAt: monthsAgo(1.5 + (i % 2)),
      });
    }
  }
}

/**
 * Seeds rehabilitation services for families.
 */
async function seedRehabForFamilies(
  familyIds: string[],
  projectId: string,
): Promise<void> {
  const serviceTypes = ["SKILL_TRAINING", "HOUSING_ALLOTMENT", "JOB_PLACEMENT", "TRANSPORT_ASSISTANCE", "COUNSELING"];
  const statuses = ["REQUESTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "COMPLETED"];
  for (let i = 0; i < familyIds.length; i++) {
    // 1-2 services per family
    const servicesCount = 1 + (i % 2);
    for (let s = 0; s < servicesCount; s++) {
      const serviceType = serviceTypes[(i + s) % serviceTypes.length];
      const status = statuses[(i + s) % statuses.length];
      await db.insert(rehabilitationServices).values({
        id: crypto.randomUUID(),
        familyId: familyIds[i],
        projectId,
        serviceType,
        status,
        notes: `${serviceType.replace(/_/g, " ").toLowerCase()} — ${status === "COMPLETED" ? "Successfully completed" : status === "SCHEDULED" ? "Scheduled for next batch" : "In progress"}`,
        scheduledDate: status !== "REQUESTED" ? monthsAgo(1 + (i % 3)) : null,
        completedDate: status === "COMPLETED" ? monthsAgo(0.5) : null,
        facilitatedBy: "u-district-1",
        createdAt: monthsAgo(2 + (i % 3)),
      });
    }
  }
}

/**
 * Seeds land bank entries for possessed/acquired parcels.
 */
async function seedLandBankForParcels(
  parcelList: SeededParcel[],
  projectId: string,
  fraction: number,
): Promise<void> {
  const count = Math.max(1, Math.round(parcelList.length * fraction));
  const reasons = [
    "Alignment revision bypassed this parcel — no longer needed",
    "Project scope reduced — surplus land",
    "Acquired but construction deferred due to budget constraints",
    "Parcel not required after design optimization",
  ];
  const statuses = ["IDLE", "UNDER_REVIEW", "IDLE", "REPURPOSED"];
  for (let i = 0; i < count; i++) {
    const parcel = parcelList[parcelList.length - 1 - i]; // take from the end
    if (!parcel) break;
    await db.insert(landBankEntries).values({
      id: crypto.randomUUID(),
      parcelId: parcel.id,
      projectId,
      status: statuses[i % statuses.length],
      reason: reasons[i % reasons.length],
      note: null,
      flaggedBy: "u-district-1",
      createdAt: monthsAgo(1),
      updatedAt: monthsAgo(0.5),
    });
  }
}

/**
 * Seeds notice drafts for projects at notification stage.
 */
async function seedNoticeDrafts(
  projectId: string,
  familyIds: string[],
  projectName: string,
): Promise<void> {
  const count = Math.min(familyIds.length, 5);
  for (let i = 0; i < count; i++) {
    await db.insert(noticeDrafts).values({
      id: crypto.randomUUID(),
      projectId,
      familyId: familyIds[i],
      draftText: `NOTICE\n\nTo: Head of Household (Family ID: ${familyIds[i].slice(0, 8)}...)\nRe: ${projectName}\n\nYou are hereby informed that the land described in the preliminary notification under Section 11 of the RFCTLARR Act, 2013 is proposed for acquisition for the above public purpose project.\n\nYou may file objections within 60 days of this notice.\n\n— District Collector`,
      status: i < 2 ? "APPROVED" : "DRAFT",
      approvedBy: i < 2 ? "u-district-1" : null,
      approvedAt: i < 2 ? monthsAgo(0.5) : null,
      createdAt: monthsAgo(1),
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log("Clearing existing data...");

  // Delete in FK-safe order: children first, parents last
  await db.delete(noticeDrafts);
  await db.delete(notificationLog);
  await db.delete(rehabilitationServices);
  await db.delete(landBankEntries);
  await db.delete(gramSabhaConsultations);
  await db.delete(tenders);
  await db.delete(legalDisputes);
  await db.delete(contractors);
  await db.delete(projectRequests);
  await db.delete(conflictDismissals);
  await db.delete(heirs);
  await db.delete(entitlements);
  await db.delete(grievances);
  await db.delete(infrastructureItems);
  await db.delete(documents);
  await db.delete(elevationProfiles);
  await db.delete(stageHistory);
  await db.delete(rrStageHistory);
  await db.delete(compensations);
  await db.delete(families);
  await db.delete(parcels);
  await db.delete(compensationRates);
  await db.delete(projects);
  await db.delete(users);

  // ── Users ──
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
  console.log(`Seeded ${DEMO_USERS.length} users.`);

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 1: Koraput River Bridge (Odisha) — DRAFT
  // ═══════════════════════════════════════════════════════════════
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
    const bridgeVillageCounters = new Map<string, number>();
    const parcelRows = generated.map((p, globalIndex) => {
      const villageIndex = bridgeVillageCounters.get(p.village) ?? 0;
      bridgeVillageCounters.set(p.village, villageIndex + 1);
      return {
        id: crypto.randomUUID(),
        projectId,
        village: p.village,
        areaHectares: p.areaHectares,
        status: "NOTIFIED" as ParcelStatus,
        geometryGeoJson: JSON.stringify(p.geometry.coordinates),
        createdAt: now,
        surveyNumber: surveyNumberFor(villageIndex),
        pattaNumber: pattaNumberFor("Koraput", globalIndex),
      };
    });
    await db.insert(parcels).values(parcelRows);
    const bridgeParcels = parcelRows.map((r) => ({ id: r.id, projectId, areaHectares: r.areaHectares, village: r.village }));

    await setCompensationRate({
      state: "Odisha",
      district: "Koraput",
      ratePerHectare: 1_500_000,
      multiplier: 1.5,
      setBy: "u-district-1",
    });

    await seedElevationProfile(projectId, alignment);

    // Deep seed: families, grievances, documents, infra, gram sabha
    const bridgeFamilies = await seedFamiliesForProject(projectId, bridgeParcels, ["Similiguda", "Kotpad"], "Odisha", 12, 0);
    await seedHeirsForFamilies(bridgeFamilies, projectId);
    await seedGrievancesForProject(projectId, ["Similiguda", "Kotpad"], 4, 0);
    await seedDocumentsForProject(projectId, "Koraput River Bridge Project", ["DPR", "SIA_REPORT", "SECTION_11_NOTICE"]);
    await seedInfraForProject(projectId, 5, 0);
    await seedGramSabhaForProject(projectId, ["Similiguda", "Kotpad"], 2);
    await seedNotificationsForFamilies(bridgeFamilies, projectId, 2);
    await seedRehabForFamilies(bridgeFamilies.slice(0, 6), projectId);
    await seedNoticeDrafts(projectId, bridgeFamilies, "Koraput River Bridge Project");
    allSeededParcelIds.push(...bridgeParcels);
    console.log("  Project 1: Koraput Bridge ✓");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 2: Chennai-Salem Green Corridor (Krishnagiri) — BREACHED
  // ═══════════════════════════════════════════════════════════════
  {
    const id = "p-tn-chennai-salem";
    const alignment: LineGeometry = { type: "LineString", coordinates: [[78.3567, 12.5426], [78.43599, 12.41444], [78.4939, 12.2753]] };
    const parcelList = await createSeedProject({
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

    const fams = await seedFamiliesForProject(id, parcelList, ["Bargur", "Uthangarai"], "Tamil Nadu", 14, 12);
    await seedHeirsForFamilies(fams, id);
    await seedGrievancesForProject(id, ["Bargur", "Uthangarai"], 5, 10);
    await seedDocumentsForProject(id, "Chennai–Salem Green Corridor Expressway", ["DPR", "SECTION_11_NOTICE", "SIA_REPORT"]);
    await seedInfraForProject(id, 6, 0.1);
    await seedGramSabhaForProject(id, ["Bargur", "Uthangarai"], 3);
    await seedNotificationsForFamilies(fams, id, 3);
    await seedRehabForFamilies(fams.slice(0, 8), id);
    await seedLandBankForParcels(parcelList, id, 0.1);
    await seedNoticeDrafts(id, fams, "Chennai–Salem Green Corridor Expressway");
    allSeededParcelIds.push(...parcelList);
    console.log("  Project 2: Chennai-Salem ✓");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 3: Chennai Metro Phase 2 (Chennai) — AT-RISK
  // ═══════════════════════════════════════════════════════════════
  {
    const id = "p-tn-chennai-metro";
    const notifiedAt = monthsAgo(5.6);
    const awardedAt = monthsAgo(2.5);
    const rate = { ratePerHectare: 8_000_000, multiplier: 1.0 };
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
    await seedCompensationForParcels(parcelList, id, rate, notifiedAt, awardedAt, 50_000, 0.5, monthsAgo(2.0));
    await seedElevationProfile(id, alignment);

    const fams = await seedFamiliesForProject(id, parcelList, ["Poonamallee", "Thirumazhisai"], "Tamil Nadu", 16, 26);
    await seedHeirsForFamilies(fams, id);
    await seedGrievancesForProject(id, ["Poonamallee", "Thirumazhisai"], 6, 15);
    await seedDocumentsForProject(id, "Chennai Metro Phase 2", ["DPR", "SECTION_11_NOTICE", "SECTION_19_DECLARATION", "SECTION_23_AWARD", "SIA_REPORT", "RR_SCHEME"]);
    await seedInfraForProject(id, 7, 0.3);
    await seedGramSabhaForProject(id, ["Poonamallee", "Thirumazhisai"], 4);
    await seedNotificationsForFamilies(fams, id, 3);
    await seedRehabForFamilies(fams, id);
    await seedLandBankForParcels(parcelList, id, 0.05);
    await seedNoticeDrafts(id, fams, "Chennai Metro Phase 2");
    allSeededParcelIds.push(...parcelList);
    console.log("  Project 3: Chennai Metro ✓");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 4: CVG Link Canal (Sivaganga) — AT-RISK R&R
  // ═══════════════════════════════════════════════════════════════
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
    await seedCompensationForParcels(parcelList, id, rate, notifiedAt, awardedAt, 25_000, 1.0, monthsAgo(4.8));
    await seedProjectTransition(id, "START_RR", "district", monthsAgo(4.9));
    await seedRRTransition(id, "COMPLETE_SURVEY", "district", monthsAgo(4.5));
    await seedRRTransition(id, "COMPLETE_SCHEME", "district", monthsAgo(3.5));
    await seedRRTransition(id, "COMPLETE_HEARING", "district", monthsAgo(2.5));
    await seedRRTransition(id, "SUBMIT_TO_COLLECTOR", "district", monthsAgo(1.5));

    const fams = await seedFamiliesForProject(id, parcelList, ["Manamadurai", "Ilayangudi"], "Tamil Nadu", 18, 42);
    await seedHeirsForFamilies(fams, id);
    await seedGrievancesForProject(id, ["Manamadurai", "Ilayangudi"], 6, 21);
    await seedDocumentsForProject(id, "CVG Link Canal", ["DPR", "SECTION_11_NOTICE", "SECTION_19_DECLARATION", "SECTION_23_AWARD", "POSSESSION_CERTIFICATE", "SIA_REPORT", "RR_SCHEME", "GRAM_SABHA_MINUTES"]);
    await seedInfraForProject(id, 8, 0.4);
    await seedGramSabhaForProject(id, ["Manamadurai", "Ilayangudi"], 5);
    await seedNotificationsForFamilies(fams, id, 4);
    await seedRehabForFamilies(fams, id);
    await seedLandBankForParcels(parcelList, id, 0.08);
    await seedNoticeDrafts(id, fams, "CVG Link Canal");
    allSeededParcelIds.push(...parcelList);
    console.log("  Project 4: CVG Canal ✓");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 5: Ennore-Kattupalli (Thiruvallur) — FULL SUCCESS
  // ═══════════════════════════════════════════════════════════════
  {
    const id = "p-tn-ennore-kattupalli";
    const notifiedAt = monthsAgo(7.8);
    const awardedAt = monthsAgo(6.5);
    const rate = { ratePerHectare: 3_500_000, multiplier: 1.5 };
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
    await seedCompensationForParcels(parcelList, id, rate, notifiedAt, awardedAt, 40_000, 1.0, monthsAgo(6.3));
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

    const fams = await seedFamiliesForProject(id, parcelList, ["Ennore", "Kattupalli"], "Tamil Nadu", 15, 60);
    await seedHeirsForFamilies(fams, id);
    await seedGrievancesForProject(id, ["Ennore", "Kattupalli"], 4, 27);
    await seedDocumentsForProject(id, "Ennore-Kattupalli Corridor", ["DPR", "SECTION_11_NOTICE", "SECTION_19_DECLARATION", "SECTION_23_AWARD", "POSSESSION_CERTIFICATE", "SIA_REPORT", "RR_SCHEME", "GRAM_SABHA_MINUTES"]);
    await seedInfraForProject(id, 8, 1.0);
    await seedGramSabhaForProject(id, ["Ennore", "Kattupalli"], 4);
    await seedNotificationsForFamilies(fams, id, 4);
    await seedRehabForFamilies(fams, id);
    await seedLandBankForParcels(parcelList, id, 0.1);
    allSeededParcelIds.push(...parcelList);
    console.log("  Project 5: Ennore-Kattupalli ✓");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 6: Coimbatore-Sathyamangalam NH Bypass — EARLY SIA
  // ═══════════════════════════════════════════════════════════════
  {
    const id = "p-tn-coimbatore-bypass";
    const alignment: LineGeometry = {
      type: "LineString",
      coordinates: [[76.9628, 11.0018], [77.01928, 11.12584], [77.1035, 11.233], [77.1589, 11.40565], [77.2654, 11.5524]],
    };
    const parcelList = await createSeedProject({
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

    const fams = await seedFamiliesForProject(id, parcelList, ["Annur", "Sathyamangalam"], "Tamil Nadu", 10, 75);
    await seedGrievancesForProject(id, ["Annur", "Sathyamangalam"], 3, 31);
    await seedDocumentsForProject(id, "Coimbatore-Sathyamangalam NH Bypass", ["DPR", "SECTION_11_NOTICE", "SIA_REPORT"]);
    await seedGramSabhaForProject(id, ["Annur", "Sathyamangalam"], 2);
    await seedNotificationsForFamilies(fams, id, 2);
    await seedNoticeDrafts(id, fams, "Coimbatore-Sathyamangalam NH Bypass");
    allSeededParcelIds.push(...parcelList);
    console.log("  Project 6: Coimbatore Bypass ✓");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 7: SIPCOT Perambalur — BREACHED COMPENSATION
  // ═══════════════════════════════════════════════════════════════
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
    await seedCompensationForParcels(parcelList, id, rate, notifiedAt, awardedAt, 30_000, 0, awardedAt);

    const fams = await seedFamiliesForProject(id, parcelList, ["Perambalur Town", "Veppanthattai"], "Tamil Nadu", 14, 85);
    await seedHeirsForFamilies(fams, id);
    await seedGrievancesForProject(id, ["Perambalur Town", "Veppanthattai"], 5, 34);
    await seedDocumentsForProject(id, "SIPCOT Perambalur", ["DPR", "SECTION_11_NOTICE", "SECTION_19_DECLARATION", "SECTION_23_AWARD", "SIA_REPORT"]);
    await seedInfraForProject(id, 6, 0.15);
    await seedGramSabhaForProject(id, ["Perambalur Town", "Veppanthattai"], 3);
    await seedNotificationsForFamilies(fams, id, 3);
    await seedRehabForFamilies(fams.slice(0, 10), id);
    await seedLandBankForParcels(parcelList, id, 0.06);
    allSeededParcelIds.push(...parcelList);
    console.log("  Project 7: SIPCOT Perambalur ✓");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 8: Bengaluru PRR (Karnataka) — ON-TRACK EARLY
  // ═══════════════════════════════════════════════════════════════
  {
    const id = "p-ka-bengaluru-prr";
    const alignment: LineGeometry = {
      type: "LineString",
      coordinates: [
        [77.7619, 13.0318], [77.75741, 13.07523], [77.74037, 13.11849],
        [77.71049, 13.1574], [77.6692, 13.18774], [77.61956, 13.20601],
        [77.5658, 13.21009], [77.5126, 13.19953], [77.4643, 13.17555],
        [77.42429, 13.14064], [77.3946, 13.098],
      ],
    };
    const parcelList = await createSeedProject({
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

    const fams = await seedFamiliesForProject(id, parcelList, ["Hoskote", "Nelamangala"], "Karnataka", 12, 99);
    await seedGrievancesForProject(id, ["Hoskote", "Nelamangala"], 4, 39);
    await seedDocumentsForProject(id, "Bengaluru PRR", ["DPR", "SECTION_11_NOTICE", "SIA_REPORT"]);
    await seedInfraForProject(id, 5, 0);
    await seedGramSabhaForProject(id, ["Hoskote", "Nelamangala"], 3);
    await seedNotificationsForFamilies(fams, id, 2);
    await seedNoticeDrafts(id, fams, "Bengaluru PRR");
    allSeededParcelIds.push(...parcelList);
    console.log("  Project 8: Bengaluru PRR ✓");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 9: Madurai Metro Phase 1
  // ═══════════════════════════════════════════════════════════════
  {
    const id = "p-tn-madurai-metro";
    const alignment: LineGeometry = { type: "LineString", coordinates: [[78.114, 9.925], [78.125, 9.940]] };
    const parcelList = await createSeedProject({
      id, name: "Madurai Metro Phase 1", purpose: "Elevated metro corridor",
      state: "Tamil Nadu", district: "Madurai", createdBy: "u-agency-1", createdAt: monthsAgo(4),
      geometry: alignment, parcelStatus: "NOTIFIED",
      parcelGenerator: { kind: "corridor", villages: ["Thirumangalam", "Othakadai"] },
      seed: 10, rate: { ratePerHectare: 5_000_000, multiplier: 1.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(4));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(3.8));
    await seedProjectTransition(id, "COMPLETE", "district", monthsAgo(3.5));

    const fams = await seedFamiliesForProject(id, parcelList, ["Thirumangalam", "Othakadai"], "Tamil Nadu", 10, 111);
    await seedGrievancesForProject(id, ["Thirumangalam", "Othakadai"], 3, 43);
    await seedDocumentsForProject(id, "Madurai Metro Phase 1", ["DPR", "SECTION_11_NOTICE", "SIA_REPORT"]);
    await seedInfraForProject(id, 5, 0);
    await seedGramSabhaForProject(id, ["Thirumangalam", "Othakadai"], 2);
    await seedNotificationsForFamilies(fams, id, 2);
    allSeededParcelIds.push(...parcelList);
    console.log("  Project 9: Madurai Metro ✓");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 10: Trichy Airport Expansion
  // ═══════════════════════════════════════════════════════════════
  {
    const id = "p-tn-trichy-airport";
    const geometry: PolygonGeometry = { type: "Polygon", coordinates: [[[78.71, 10.76], [78.72, 10.76], [78.72, 10.77], [78.71, 10.77], [78.71, 10.76]]] };
    const parcelList = await createSeedProject({
      id, name: "Trichy International Airport Runway Expansion", purpose: "Runway extension and new terminal",
      state: "Tamil Nadu", district: "Tiruchirappalli", createdBy: "u-agency-1", createdAt: monthsAgo(12),
      geometry, parcelStatus: "ACQUIRED",
      parcelGenerator: { kind: "grid", villages: ["Kottapattu", "Kottapattu"] },
      seed: 11, rate: { ratePerHectare: 4_000_000, multiplier: 1.5 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(12));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(11.8));
    await seedProjectTransition(id, "COMPLETE", "district", monthsAgo(11.5));
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(11.0));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(10.5));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(10.0));
    await seedProjectTransition(id, "PASS_AWARD", "district", monthsAgo(8.0));

    const fams = await seedFamiliesForProject(id, parcelList, ["Kottapattu"], "Tamil Nadu", 10, 121);
    await seedHeirsForFamilies(fams, id);
    await seedGrievancesForProject(id, ["Kottapattu"], 3, 46);
    await seedDocumentsForProject(id, "Trichy Airport Expansion", ["DPR", "SECTION_11_NOTICE", "SECTION_19_DECLARATION", "SECTION_23_AWARD", "SIA_REPORT"]);
    await seedInfraForProject(id, 6, 0.5);
    await seedGramSabhaForProject(id, ["Kottapattu"], 3);
    await seedNotificationsForFamilies(fams, id, 3);
    await seedRehabForFamilies(fams.slice(0, 6), id);
    allSeededParcelIds.push(...parcelList);
    console.log("  Project 10: Trichy Airport ✓");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 11: Tuticorin Port Rail Link
  // ═══════════════════════════════════════════════════════════════
  {
    const id = "p-tn-tuticorin-rail";
    const alignment: LineGeometry = { type: "LineString", coordinates: [[78.16, 8.75], [78.18, 8.78]] };
    const parcelList = await createSeedProject({
      id, name: "Tuticorin Port Dedicated Freight Rail Link", purpose: "Rail connectivity to VOC Port",
      state: "Tamil Nadu", district: "Thoothukudi", createdBy: "u-agency-1", createdAt: monthsAgo(18),
      geometry: alignment, parcelStatus: "POSSESSED",
      parcelGenerator: { kind: "corridor", villages: ["Milavittan", "Milavittan"] },
      seed: 12, rate: { ratePerHectare: 1_200_000, multiplier: 2.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(18));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(17.8));
    await seedProjectTransition(id, "COMPLETE", "district", monthsAgo(17.5));
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(17.0));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(16.5));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(16.0));
    await seedProjectTransition(id, "PASS_AWARD", "district", monthsAgo(14.0));
    await seedProjectTransition(id, "START_RR", "district", monthsAgo(13.9));
    await seedProjectTransition(id, "COMPLETE_RR", "district", monthsAgo(10.0));
    await seedProjectTransition(id, "COMPLETE_INFRASTRUCTURE", "district", monthsAgo(8.0));

    const fams = await seedFamiliesForProject(id, parcelList, ["Milavittan"], "Tamil Nadu", 8, 131);
    await seedGrievancesForProject(id, ["Milavittan"], 2, 49);
    await seedDocumentsForProject(id, "Tuticorin Rail Link", ["DPR", "SECTION_11_NOTICE", "SECTION_19_DECLARATION", "SECTION_23_AWARD", "POSSESSION_CERTIFICATE", "SIA_REPORT", "RR_SCHEME"]);
    await seedInfraForProject(id, 7, 1.0);
    await seedGramSabhaForProject(id, ["Milavittan"], 3);
    await seedNotificationsForFamilies(fams, id, 4);
    await seedRehabForFamilies(fams, id);
    allSeededParcelIds.push(...parcelList);
    console.log("  Project 11: Tuticorin Rail ✓");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 12: Salem Steel Plant Expansion
  // ═══════════════════════════════════════════════════════════════
  {
    const id = "p-tn-salem-steel";
    const geometry: PolygonGeometry = { type: "Polygon", coordinates: [[[78.11, 11.66], [78.12, 11.66], [78.12, 11.67], [78.11, 11.67], [78.11, 11.66]]] };
    const parcelList = await createSeedProject({
      id, name: "Salem Steel Plant Phase 3 Land Acquisition", purpose: "Industrial expansion",
      state: "Tamil Nadu", district: "Salem", createdBy: "u-agency-1", createdAt: monthsAgo(2),
      geometry, parcelStatus: "NOTIFIED",
      parcelGenerator: { kind: "grid", villages: ["Thirumalaigiri", "Thirumalaigiri"] },
      seed: 13, rate: { ratePerHectare: 2_500_000, multiplier: 1.5 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(2));

    const fams = await seedFamiliesForProject(id, parcelList, ["Thirumalaigiri"], "Tamil Nadu", 8, 139);
    await seedGrievancesForProject(id, ["Thirumalaigiri"], 2, 51);
    await seedDocumentsForProject(id, "Salem Steel Plant", ["DPR", "SIA_REPORT", "SECTION_11_NOTICE"]);
    await seedGramSabhaForProject(id, ["Thirumalaigiri"], 2);
    await seedNotificationsForFamilies(fams, id, 1);
    await seedNoticeDrafts(id, fams, "Salem Steel Plant");
    allSeededParcelIds.push(...parcelList);
    console.log("  Project 12: Salem Steel ✓");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 13: Vellore Smart City Pipeline
  // ═══════════════════════════════════════════════════════════════
  {
    const id = "p-tn-vellore-water";
    const alignment: LineGeometry = { type: "LineString", coordinates: [[79.13, 12.91], [79.14, 12.92]] };
    const parcelList = await createSeedProject({
      id, name: "Vellore Smart City Pipeline Corridor", purpose: "Underground water pipeline",
      state: "Tamil Nadu", district: "Vellore", createdBy: "u-agency-1", createdAt: monthsAgo(6),
      geometry: alignment, parcelStatus: "NOTIFIED",
      parcelGenerator: { kind: "corridor", villages: ["Katpadi", "Vellore Town"] },
      seed: 14, rate: { ratePerHectare: 3_000_000, multiplier: 1.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(6));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(5.8));
    await seedProjectTransition(id, "COMPLETE", "district", monthsAgo(5.5));

    const fams = await seedFamiliesForProject(id, parcelList, ["Katpadi", "Vellore Town"], "Tamil Nadu", 10, 147);
    await seedGrievancesForProject(id, ["Katpadi", "Vellore Town"], 3, 53);
    await seedDocumentsForProject(id, "Vellore Pipeline", ["DPR", "SECTION_11_NOTICE", "SIA_REPORT"]);
    await seedInfraForProject(id, 5, 0.2);
    await seedGramSabhaForProject(id, ["Katpadi", "Vellore Town"], 2);
    await seedNotificationsForFamilies(fams, id, 2);
    allSeededParcelIds.push(...parcelList);
    console.log("  Project 13: Vellore Pipeline ✓");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 14 (NEW): Thanjavur Solar Park
  // ═══════════════════════════════════════════════════════════════
  {
    const id = "p-tn-thanjavur-solar";
    const geometry: PolygonGeometry = { type: "Polygon", coordinates: [[[79.05, 10.72], [79.07, 10.72], [79.07, 10.74], [79.05, 10.74], [79.05, 10.72]]] };
    const parcelList = await createSeedProject({
      id, name: "Thanjavur Solar Energy Park", purpose: "500 MW solar power generation park",
      state: "Tamil Nadu", district: "Thanjavur", createdBy: "u-agency-1", createdAt: monthsAgo(7),
      geometry, parcelStatus: "ACQUIRED",
      parcelGenerator: { kind: "grid", villages: ["Orathanadu", "Pattukkottai"] },
      seed: 15, rate: { ratePerHectare: 800_000, multiplier: 2.5 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(7));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(6.8));
    await seedProjectTransition(id, "COMPLETE", "district", monthsAgo(6.5));
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(6.2));
    await seedProjectTransition(id, "CENTRAL_APPROVE", "central", monthsAgo(6.0));
    await seedProjectTransition(id, "PUBLISH_DECLARATION", "district", monthsAgo(5.5));
    await seedProjectTransition(id, "PASS_AWARD", "district", monthsAgo(4.5));

    const fams = await seedFamiliesForProject(id, parcelList, ["Orathanadu", "Pattukkottai"], "Tamil Nadu", 12, 157);
    await seedHeirsForFamilies(fams, id);
    await seedGrievancesForProject(id, ["Orathanadu", "Pattukkottai"], 4, 56);
    await seedDocumentsForProject(id, "Thanjavur Solar Park", ["DPR", "SECTION_11_NOTICE", "SECTION_19_DECLARATION", "SECTION_23_AWARD", "SIA_REPORT", "RR_SCHEME"]);
    await seedInfraForProject(id, 6, 0.3);
    await seedGramSabhaForProject(id, ["Orathanadu", "Pattukkottai"], 4);
    await seedNotificationsForFamilies(fams, id, 3);
    await seedRehabForFamilies(fams.slice(0, 8), id);
    await seedLandBankForParcels(parcelList, id, 0.1);
    allSeededParcelIds.push(...parcelList);
    console.log("  Project 14: Thanjavur Solar ✓ (NEW)");
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT 15 (NEW): Kanchipuram IT Corridor
  // ═══════════════════════════════════════════════════════════════
  {
    const id = "p-tn-kanchipuram-it";
    const alignment: LineGeometry = { type: "LineString", coordinates: [[79.72, 12.82], [79.74, 12.84], [79.76, 12.85]] };
    const parcelList = await createSeedProject({
      id, name: "Kanchipuram IT Corridor Extension", purpose: "IT/ITES special economic zone expansion",
      state: "Tamil Nadu", district: "Kanchipuram", createdBy: "u-agency-1", createdAt: monthsAgo(5),
      geometry: alignment, parcelStatus: "NOTIFIED",
      parcelGenerator: { kind: "corridor", villages: ["Sriperumbudur", "Oragadam"] },
      seed: 16, rate: { ratePerHectare: 7_000_000, multiplier: 1.0 },
    });
    await seedProjectTransition(id, "SUBMIT", "agency", monthsAgo(5));
    await seedProjectTransition(id, "APPROVE", "district", monthsAgo(4.8));
    await seedProjectTransition(id, "COMPLETE", "district", monthsAgo(4.5));
    await seedProjectTransition(id, "STATE_APPROVE", "state", monthsAgo(4.2));
    await seedElevationProfile(id, alignment);

    const fams = await seedFamiliesForProject(id, parcelList, ["Sriperumbudur", "Oragadam"], "Tamil Nadu", 12, 169);
    await seedGrievancesForProject(id, ["Sriperumbudur", "Oragadam"], 4, 60);
    await seedDocumentsForProject(id, "Kanchipuram IT Corridor", ["DPR", "SECTION_11_NOTICE", "SIA_REPORT", "GRAM_SABHA_MINUTES"]);
    await seedInfraForProject(id, 5, 0);
    await seedGramSabhaForProject(id, ["Sriperumbudur", "Oragadam"], 3);
    await seedNotificationsForFamilies(fams, id, 2);
    await seedNoticeDrafts(id, fams, "Kanchipuram IT Corridor");
    allSeededParcelIds.push(...parcelList);
    console.log("  Project 15: Kanchipuram IT ✓ (NEW)");
  }

  // ═══════════════════════════════════════════════════════════════
  //  CROSS-PROJECT: Contractors (12)
  // ═══════════════════════════════════════════════════════════════
  console.log("Seeding contractors...");
  const contractorIds: string[] = [];
  const contractorData = [
    { name: "Sundaram Infra Projects Pvt. Ltd.", reg: "TN-CON-88213", spec: "Canal & irrigation works", rating: 4.2 },
    { name: "Kaveri Bridgeworks & Co.", reg: "OD-CON-40217", spec: "Bridge & structural works", rating: 3.8 },
    { name: "Lakshmi Construction Corp.", reg: "TN-CON-55410", spec: "Highway & road construction", rating: 4.5 },
    { name: "Southern Rail Infra Ltd.", reg: "TN-CON-72901", spec: "Railway & metro corridors", rating: 4.0 },
    { name: "Bharathi Earthmovers", reg: "TN-CON-31087", spec: "Earthwork & site clearance", rating: 3.5 },
    { name: "Ponni Water Systems", reg: "TN-CON-62304", spec: "Water supply & pipeline works", rating: 4.1 },
    { name: "KSR Builders", reg: "KA-CON-19452", spec: "Residential & resettlement colony", rating: 3.9 },
    { name: "Anbu Power Infra", reg: "TN-CON-48766", spec: "Power line & electrical works", rating: 4.3 },
    { name: "Velan Structural Engineers", reg: "TN-CON-80125", spec: "Bridge & flyover fabrication", rating: 4.4 },
    { name: "Delta Land Developers", reg: "TN-CON-95531", spec: "Industrial park development", rating: 3.7 },
    { name: "Cauvery Civil Contractors", reg: "TN-CON-11098", spec: "Canal lining & embankment", rating: 3.6 },
    { name: "Nila Solar Installations", reg: "TN-CON-67843", spec: "Solar park construction", rating: 4.0 },
  ];
  for (const c of contractorData) {
    const cid = crypto.randomUUID();
    contractorIds.push(cid);
    await db.insert(contractors).values({
      id: cid,
      name: c.name,
      registrationNumber: c.reg,
      specialization: c.spec,
      rating: c.rating,
      createdAt: daysAgo(300 + Math.random() * 200),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  CROSS-PROJECT: Tenders (3-5 per project)
  // ═══════════════════════════════════════════════════════════════
  console.log("Seeding tenders...");
  const tenderData: { projectId: string; num: string; title: string; scope: string; est: number; status: string; ci: number | null; av: number | null }[] = [
    // CVG Canal
    { projectId: "p-tn-cvg-canal", num: "TND-2026-4471", title: "Canal lining and embankment works — Reach 2", scope: "Concrete lining, embankment reinforcement along Reach 2.", est: 84_500_000, status: "IN_PROGRESS", ci: 0, av: 81_200_000 },
    { projectId: "p-tn-cvg-canal", num: "TND-2025-2210", title: "Preliminary earthwork — Reach 1", scope: "Site clearance and earthwork for Reach 1.", est: 32_000_000, status: "COMPLETED", ci: 0, av: 30_500_000 },
    { projectId: "p-tn-cvg-canal", num: "TND-2026-5501", title: "Aqueduct construction at Vaigai crossing", scope: "Design and construction of aqueduct structure.", est: 120_000_000, status: "PUBLISHED", ci: null, av: null },
    // Bridge
    { projectId: "p-demo-bridge-1", num: "TND-2026-5023", title: "Bridge superstructure works", scope: "Fabrication and erection of bridge superstructure.", est: 212_000_000, status: "PUBLISHED", ci: null, av: null },
    { projectId: "p-demo-bridge-1", num: "TND-2026-5024", title: "Bridge foundation and piling", scope: "Deep foundation piling works for bridge piers.", est: 95_000_000, status: "PUBLISHED", ci: null, av: null },
    // Chennai Metro
    { projectId: "p-tn-chennai-metro", num: "TND-2026-6100", title: "Elevated viaduct — Section 1", scope: "Pre-cast segmental viaduct construction.", est: 450_000_000, status: "IN_PROGRESS", ci: 3, av: 430_000_000 },
    { projectId: "p-tn-chennai-metro", num: "TND-2026-6101", title: "Station building — Poonamallee", scope: "Metro station construction and finishing.", est: 180_000_000, status: "PUBLISHED", ci: null, av: null },
    { projectId: "p-tn-chennai-metro", num: "TND-2026-6102", title: "Power line relocation — Thirumangalam", scope: "HT/LT power line shifting along corridor.", est: 22_000_000, status: "COMPLETED", ci: 7, av: 21_500_000 },
    // Ennore-Kattupalli
    { projectId: "p-tn-ennore-kattupalli", num: "TND-2025-3300", title: "Port access road — Phase 1", scope: "4-lane road construction from Ennore junction.", est: 150_000_000, status: "COMPLETED", ci: 2, av: 142_000_000 },
    { projectId: "p-tn-ennore-kattupalli", num: "TND-2025-3301", title: "Freight terminal construction", scope: "Container handling yard and terminal building.", est: 280_000_000, status: "IN_PROGRESS", ci: 2, av: 265_000_000 },
    { projectId: "p-tn-ennore-kattupalli", num: "TND-2026-3302", title: "Railway siding extension", scope: "Broad gauge siding to connect port terminal.", est: 90_000_000, status: "PUBLISHED", ci: null, av: null },
    // Coimbatore Bypass
    { projectId: "p-tn-coimbatore-bypass", num: "TND-2026-7000", title: "NH bypass — preliminary survey", scope: "Topographical and geotechnical survey.", est: 8_000_000, status: "COMPLETED", ci: 4, av: 7_800_000 },
    // SIPCOT
    { projectId: "p-tn-sipcot-perambalur", num: "TND-2026-7500", title: "Industrial plot development — Zone A", scope: "Site leveling, internal roads, drainage.", est: 65_000_000, status: "PUBLISHED", ci: null, av: null },
    { projectId: "p-tn-sipcot-perambalur", num: "TND-2026-7501", title: "Common effluent treatment plant", scope: "CETP construction for industrial zone.", est: 45_000_000, status: "PUBLISHED", ci: null, av: null },
    // Trichy Airport
    { projectId: "p-tn-trichy-airport", num: "TND-2025-8000", title: "Runway extension earthwork", scope: "Earthwork and compaction for 1200m extension.", est: 55_000_000, status: "COMPLETED", ci: 4, av: 52_000_000 },
    { projectId: "p-tn-trichy-airport", num: "TND-2026-8001", title: "New terminal building — Phase 1", scope: "Terminal building construction and MEP.", est: 350_000_000, status: "IN_PROGRESS", ci: 2, av: 340_000_000 },
    // Tuticorin Rail
    { projectId: "p-tn-tuticorin-rail", num: "TND-2025-8500", title: "Track laying — mainline", scope: "Rail track installation and ballast work.", est: 180_000_000, status: "COMPLETED", ci: 3, av: 175_000_000 },
    { projectId: "p-tn-tuticorin-rail", num: "TND-2025-8501", title: "Signaling and telecom", scope: "Electronic interlocking and telecom systems.", est: 45_000_000, status: "COMPLETED", ci: 7, av: 43_000_000 },
    // Thanjavur Solar
    { projectId: "p-tn-thanjavur-solar", num: "TND-2026-9000", title: "Solar panel mounting structures", scope: "Foundation and mounting structure for 500 MW.", est: 200_000_000, status: "PUBLISHED", ci: null, av: null },
    { projectId: "p-tn-thanjavur-solar", num: "TND-2026-9001", title: "Transmission line — solar park", scope: "220kV transmission line to TNEB substation.", est: 75_000_000, status: "IN_PROGRESS", ci: 7, av: 72_000_000 },
    // Kanchipuram IT
    { projectId: "p-tn-kanchipuram-it", num: "TND-2026-9500", title: "IT corridor access road", scope: "6-lane access road construction.", est: 110_000_000, status: "PUBLISHED", ci: null, av: null },
  ];

  for (const t of tenderData) {
    await db.insert(tenders).values({
      id: crypto.randomUUID(),
      projectId: t.projectId,
      tenderNumber: t.num,
      title: t.title,
      scope: t.scope,
      estimatedValue: t.est,
      status: t.status,
      publishedDate: daysAgo(t.status === "COMPLETED" ? 300 : t.status === "IN_PROGRESS" ? 150 : 20),
      submissionDeadline: daysAgo(t.status === "COMPLETED" ? 270 : t.status === "IN_PROGRESS" ? 120 : -25),
      contractorId: t.ci !== null ? contractorIds[t.ci % contractorIds.length] : null,
      awardedValue: t.av,
      awardedDate: t.av ? daysAgo(t.status === "COMPLETED" ? 250 : 100) : null,
      createdBy: "u-district-1",
      createdAt: daysAgo(t.status === "COMPLETED" ? 300 : t.status === "IN_PROGRESS" ? 150 : 20),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  CROSS-PROJECT: Legal Disputes (15+)
  // ═══════════════════════════════════════════════════════════════
  console.log("Seeding legal disputes...");
  const legalDisputeData = [
    { projectId: "p-tn-cvg-canal", case: "WP(C) 4821/2026", court: "Madras High Court", title: "Objection to canal alignment through temple land", party: "Sri Meenakshi Devasthanam Trust", status: "HEARING", summary: "Petitioner contends the notified alignment encroaches on trust-held temple land.", outcome: null, isStay: false },
    { projectId: "p-tn-cvg-canal", case: "WP(C) 3390/2025", court: "Madras High Court", title: "Compensation rate revision petition", party: "K. Rajendran & Ors.", status: "DISPOSED", summary: "Group petition seeking compensation rate parity with adjoining district.", outcome: "Disposed — compensation rate revised upward by 8% per court direction.", isStay: false },
    { projectId: "p-tn-cvg-canal", case: "WP(C) 5102/2026", court: "Madras High Court", title: "Stay on possession — agricultural season", party: "Farmers Welfare Association, Sivaganga", status: "HEARING", summary: "Petitioner seeks stay on possession until harvest season ends.", outcome: null, isStay: true },
    { projectId: "p-tn-chennai-metro", case: "WP(C) 2200/2026", court: "Madras High Court", title: "Challenge to SIA report adequacy", party: "Poonamallee Residents Association", status: "HEARING", summary: "Residents allege SIA report did not adequately assess livelihood impact on street vendors.", outcome: null, isStay: false },
    { projectId: "p-tn-chennai-metro", case: "WP(C) 2201/2026", court: "Madras High Court", title: "Stay order — temple demolition", party: "Sri Vinayagar Temple Committee", status: "HEARING", summary: "Stay on demolition of temple structure pending heritage assessment.", outcome: null, isStay: true },
    { projectId: "p-tn-chennai-salem", case: "WP(C) 1800/2025", court: "Madras High Court", title: "Environmental clearance challenge", party: "Green Earth Foundation", status: "DISPOSED", summary: "Challenge to EC validity for expressway through eco-sensitive zone.", outcome: "Dismissed — EC found valid; additional conditions imposed.", isStay: false },
    { projectId: "p-tn-chennai-salem", case: "WP(C) 1801/2026", court: "Supreme Court of India", title: "SLP against land acquisition notification", party: "Landowners Collective, Krishnagiri", status: "HEARING", summary: "Special leave petition challenging validity of Section 11 notification.", outcome: null, isStay: true },
    { projectId: "p-tn-sipcot-perambalur", case: "WP(C) 3000/2026", court: "Madras High Court", title: "Compensation non-payment challenge", party: "Veppanthattai Farmers Union", status: "HEARING", summary: "Award passed but no compensation paid for 4 months — petitioners seek contempt proceedings.", outcome: null, isStay: false },
    { projectId: "p-tn-sipcot-perambalur", case: "WP(C) 3001/2026", court: "Madras High Court", title: "Challenge to multiplier calculation", party: "M. Thirunavukkarasu", status: "FILED", summary: "Individual petition challenging multiplier applied for rural land.", outcome: null, isStay: false },
    { projectId: "p-ka-bengaluru-prr", case: "WP(C) 4400/2026", court: "Karnataka High Court", title: "Lake encroachment objection", party: "Bengaluru Lake Development Authority", status: "HEARING", summary: "Allegation that PRR alignment encroaches on notified lake buffer zone.", outcome: null, isStay: true },
    { projectId: "p-demo-bridge-1", case: "WP(C) 1100/2026", court: "Orissa High Court", title: "Tribal land rights petition", party: "Similiguda Tribal Council", status: "HEARING", summary: "Petition under Forest Rights Act challenging acquisition of forest land.", outcome: null, isStay: false },
    { projectId: "p-tn-ennore-kattupalli", case: "WP(C) 5500/2025", court: "Madras High Court", title: "Fishermen livelihood compensation", party: "Ennore Fishermen Cooperative", status: "DISPOSED", summary: "Fishermen affected by port road seeking livelihood compensation.", outcome: "Settled — additional livelihood grant of ₹1.5 lakh per family approved.", isStay: false },
    { projectId: "p-tn-thanjavur-solar", case: "WP(C) 6000/2026", court: "Madras High Court", title: "Agricultural land conversion objection", party: "Delta Farmers Association", status: "HEARING", summary: "Objection to conversion of prime agricultural land for solar park.", outcome: null, isStay: false },
    { projectId: "p-tn-kanchipuram-it", case: "WP(C) 6500/2026", court: "Madras High Court", title: "Heritage zone buffer challenge", party: "Kanchipuram Heritage Foundation", status: "FILED", summary: "IT corridor extension allegedly violates ASI heritage zone buffer around Pallava monuments.", outcome: null, isStay: false },
    { projectId: "p-tn-trichy-airport", case: "WP(C) 7000/2025", court: "Madras High Court", title: "Noise pollution compensation", party: "Kottapattu Residents Welfare Association", status: "DISPOSED", summary: "Residents near runway extension seeking additional noise mitigation compensation.", outcome: "Directed — additional soundproofing grant of ₹50,000 per household within 500m.", isStay: false },
    { projectId: "p-tn-madurai-metro", case: "WP(C) 7500/2026", court: "Madras High Court", title: "Market displacement petition", party: "Madurai Flower Market Vendors", status: "HEARING", summary: "Vendors petition for temporary market space during metro construction.", outcome: null, isStay: false },
  ];

  for (const ld of legalDisputeData) {
    await db.insert(legalDisputes).values({
      id: crypto.randomUUID(),
      projectId: ld.projectId,
      caseNumber: ld.case,
      court: ld.court,
      title: ld.title,
      partyName: ld.party,
      status: ld.status,
      filedDate: daysAgo(ld.status === "DISPOSED" ? 400 : 90),
      nextHearingDate: ld.status === "HEARING" ? daysAgo(-14) : null,
      summary: ld.summary,
      outcome: ld.outcome,
      isStayOrder: ld.isStay,
      stayClearedAt: null,
      createdBy: "u-district-1",
      createdAt: daysAgo(ld.status === "DISPOSED" ? 400 : 90),
      updatedAt: daysAgo(10),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  CROSS-PROJECT: Project Requests (from seed-new-features)
  // ═══════════════════════════════════════════════════════════════
  console.log("Seeding project requests...");
  await db.insert(projectRequests).values([
    {
      id: "REQ-2026-K3P9XZ",
      title: "Bridge over Kolab river at Semiliguda",
      purpose: "Connect Semiliguda to the district headquarters during monsoon flooding",
      description: "Every monsoon the existing low-level crossing floods for 3-4 weeks, cutting off nearly 6,000 residents from the district hospital and market. A permanent bridge would resolve this.",
      state: "Odisha",
      district: "Koraput",
      village: "Semiliguda",
      requesterName: "Biswajit Mohanty",
      requesterContact: "9437xxxxxx",
      status: "UNDER_REVIEW",
      reviewNote: null,
      reviewedBy: "u-district-1",
      reviewedAt: daysAgo(5),
      linkedProjectId: null,
      createdAt: daysAgo(20),
    },
    {
      id: "REQ-2026-M7QW2A",
      title: "Community water tank in Kundra",
      purpose: "Piped water supply for Kundra village cluster",
      description: "Requesting acquisition of a small parcel to build an elevated water tank serving four adjoining hamlets currently relying on a single seasonal well.",
      state: "Odisha",
      district: "Koraput",
      village: "Kundra",
      requesterName: "Laxmi Priya Sahu",
      requesterContact: null,
      status: "SUBMITTED",
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
      linkedProjectId: null,
      createdAt: daysAgo(3),
    },
    {
      id: "REQ-2026-TN01AB",
      title: "Bypass road for Sivaganga town",
      purpose: "Divert heavy vehicle traffic away from town center",
      description: "Heavy trucks traveling to Madurai via Sivaganga pass through narrow town roads causing congestion and accidents. A bypass would improve safety.",
      state: "Tamil Nadu",
      district: "Sivaganga",
      village: null,
      requesterName: "Sivaganga Town Panchayat",
      requesterContact: "sivaganga.panchayat@tn.gov.in",
      status: "SUBMITTED",
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
      linkedProjectId: null,
      createdAt: daysAgo(7),
    },
  ]);

  // ═══════════════════════════════════════════════════════════════
  //  COVER PHOTOS (merged from seed-photos.ts)
  // ═══════════════════════════════════════════════════════════════
  console.log("Assigning cover photos...");
  const coverPhotos: Record<string, string> = {
    "p-demo-bridge-1": "https://picsum.photos/seed/koraput-bridge-site/1200/500",
    "p-tn-chennai-salem": "https://picsum.photos/seed/chennai-salem-expressway/1200/500",
    "p-tn-chennai-metro": "https://picsum.photos/seed/chennai-metro-site/1200/500",
    "p-tn-cvg-canal": "https://picsum.photos/seed/cvg-canal-site/1200/500",
    "p-tn-ennore-kattupalli": "https://picsum.photos/seed/ennore-port-corridor/1200/500",
    "p-tn-coimbatore-bypass": "https://picsum.photos/seed/coimbatore-bypass/1200/500",
    "p-tn-sipcot-perambalur": "https://picsum.photos/seed/sipcot-perambalur/1200/500",
    "p-ka-bengaluru-prr": "https://picsum.photos/seed/bengaluru-prr/1200/500",
    "p-tn-madurai-metro": "https://picsum.photos/seed/madurai-metro/1200/500",
    "p-tn-trichy-airport": "https://picsum.photos/seed/trichy-airport/1200/500",
    "p-tn-tuticorin-rail": "https://picsum.photos/seed/tuticorin-rail/1200/500",
    "p-tn-salem-steel": "https://picsum.photos/seed/salem-steel/1200/500",
    "p-tn-vellore-water": "https://picsum.photos/seed/vellore-pipeline/1200/500",
    "p-tn-thanjavur-solar": "https://picsum.photos/seed/thanjavur-solar/1200/500",
    "p-tn-kanchipuram-it": "https://picsum.photos/seed/kanchipuram-it/1200/500",
  };
  for (const [pid, url] of Object.entries(coverPhotos)) {
    await db.update(projects).set({ coverPhotoUrl: url }).where(eq(projects.id, pid));
  }

  // Site photos for CVG canal parcels (first 6)
  const cvgParcels = await db.select().from(parcels).where(eq(parcels.projectId, "p-tn-cvg-canal"));
  for (const [i, p] of cvgParcels.slice(0, 6).entries()) {
    await db
      .update(parcels)
      .set({ sitePhotoUrl: `https://picsum.photos/seed/parcel-${p.id.slice(0, 6)}-${i}/600/450` })
      .where(eq(parcels.id, p.id));
  }

  // Completion photos for completed infrastructure items
  const completedInfra = await db.select().from(infrastructureItems).where(eq(infrastructureItems.status, "COMPLETE"));
  for (const item of completedInfra) {
    await db
      .update(infrastructureItems)
      .set({ completionPhotoUrl: `https://picsum.photos/seed/infra-${item.id.slice(0, 6)}/600/450` })
      .where(eq(infrastructureItems.id, item.id));
  }

  // ═══════════════════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════");
  console.log("Seed complete!");
  console.log(`  Users:          ${DEMO_USERS.length}`);
  console.log(`  Projects:       15`);
  console.log(`  Families:       ${allSeededFamilyIds.length}`);
  console.log(`  Contractors:    ${contractorIds.length}`);
  console.log(`  Tenders:        ${tenderData.length}`);
  console.log(`  Legal disputes: ${legalDisputeData.length}`);
  console.log("═══════════════════════════════════════\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
