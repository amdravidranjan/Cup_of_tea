/**
 * Document intelligence — reading the revenue record, not just the file.
 *
 * Presented in the UI as an "AI document reader". Under the hood this is a
 * deterministic extraction: every value is derived from a hash of the
 * document id, so the same upload always reads back the same owner, the
 * same survey number and the same plot boundary. It is not a trained
 * OCR/vision model, and re-uploading the same file produces a fresh
 * document id and therefore a fresh (but internally consistent) record.
 *
 * Why determinism matters beyond reproducibility: the server re-runs this
 * extraction when the officer confirms an ingest, rather than trusting a
 * geometry posted by the browser. Same document id in, same polygon out —
 * so the preview an officer approves is provably the record that gets
 * written.
 *
 * What each document yields is set in `lib/document-categories.ts`:
 *   FMB sketch / DGPS survey report → a parcel, boundary included
 *   Patta / chitta extract          → the titleholder family
 * Everything else is read for display only.
 */

import { polygonAreaHectares, type Geometry, type PolygonGeometry, type Position } from "@/lib/geo";
import {
  districtReferencePoint,
  formatExtent,
  landClassificationLabel,
  affectedFamilyBasisLabel,
  type AffectedFamilyBasis,
  type BoundaryMethod,
  type LandClassification,
} from "@/lib/land-records";

export interface ExtractedField {
  label: string;
  value: string;
  confidence: number; // 0-1
}

/** A parcel read off a cadastral document, ready to be written as a record. */
export interface ExtractedParcelRecord {
  village: string;
  surveyNumber: string;
  areaHectares: number;
  landClassification: LandClassification;
  boundaryMethod: BoundaryMethod;
  geometry: PolygonGeometry;
  /** An FMB sheet identifies a plot by who it touches, not by coordinates. */
  adjoiningSurveyNumbers: string[];
}

/** A household read off a record of rights. Always a titleholder — everyone
 *  else has to be found by the SIA survey, not by reading a patta. */
export interface ExtractedFamilyRecord {
  headOfHouseholdName: string;
  village: string;
  category: string;
  memberCount: number;
  vulnerableGroup: boolean;
  entitlementBasis: AffectedFamilyBasis;
  /** Masked at the point of extraction — the full number is never stored. */
  aadhaarMasked: string;
  rationCardNumber: string;
  pattaNumber: string;
  surveyNumber: string;
}

export interface DocumentExtraction {
  fields: ExtractedField[];
  overallConfidence: number;
  method: string;
  parcel?: ExtractedParcelRecord;
  family?: ExtractedFamilyRecord;
  /** Findings an officer must act on but which no record can absorb —
   *  an encumbrance on the title, a valuation that changes the award. */
  advisories?: string[];
}

export interface ExtractionInput {
  documentId: string;
  fileName: string;
  category: string;
  mimeType: string;
  sizeBytes: number;
  projectName: string;
  projectPurpose: string;
  state: string;
  district: string;
  /** The project alignment, when one has been drawn — parcels read out of a
   *  document are placed near it rather than near the district centre. */
  alignment?: Geometry | null;
  /** Villages and survey numbers already on this project. A patta extract
   *  read for a project that already has parcels should name one of them,
   *  the way a real one would — that is what lets the owner be linked to
   *  the right plot instead of floating unattached. */
  knownVillages?: string[];
  knownSurveyNumbers?: string[];
}

/* ── Deterministic randomness ─────────────────────────────────────────── */

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngFor(documentId: string, salt: string): () => number {
  return mulberry32(hashSeed(`${documentId}:${salt}`));
}

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

function seededConfidence(seed: string, base: number): number {
  const jitter = mulberry32(hashSeed(seed))() * 0.12 - 0.06; // ±6%
  return Math.max(0.55, Math.min(0.99, base + jitter));
}

/* ── Reference data ───────────────────────────────────────────────────── */

const GIVEN_NAMES = [
  "Murugan", "Lakshmi", "Ramasamy", "Kaliyammal", "Selvaraj", "Meenakshi",
  "Palanisamy", "Ponnammal", "Duraisamy", "Saroja", "Kandasamy", "Vasanthi",
  "Chinnadurai", "Amirtham", "Ganesan", "Rajeswari", "Subramani", "Thulasi",
];
const INITIALS = ["R", "K", "M", "S", "P", "V", "A", "T", "N", "G"];

const VILLAGE_NAMES = [
  "Melur", "Sirumugai", "Vadakkupattu", "Kilambakkam", "Thirunageswaram",
  "Alangudi", "Perungudi", "Nallampatti", "Sengottai", "Kadambur",
];

const FAMILY_CATEGORY_POOL = ["landowner"] as const;

const LAND_CLASSIFICATION_POOL: LandClassification[] = [
  "NANJAI", "PUNJAI", "PUNJAI", "MANAVARI", "HOUSE_SITE",
];

function personName(rng: () => number): string {
  return `${pick(INITIALS, rng)}. ${pick(GIVEN_NAMES, rng)}`;
}

function surveyNumber(rng: () => number): string {
  const base = 60 + Math.floor(rng() * 240);
  const sub = 1 + Math.floor(rng() * 4);
  const letter = rng() > 0.6 ? pick(["A", "B", "C"], rng) : "";
  return `${base}/${sub}${letter}`;
}

function maskedAadhaar(rng: () => number): string {
  const last4 = String(1000 + Math.floor(rng() * 9000));
  return `XXXX XXXX ${last4}`;
}

function rationCard(rng: () => number): string {
  return `TN${String(10 + Math.floor(rng() * 89))}${String(100000 + Math.floor(rng() * 899999))}`;
}

/* ── Placing a plot on the ground ─────────────────────────────────────── */

function anchorFor(input: ExtractionInput): Position {
  const alignment = input.alignment;
  if (alignment) {
    const coords =
      alignment.type === "LineString" ? alignment.coordinates : alignment.coordinates[0];
    if (coords && coords.length > 0) {
      // Middle of the alignment: parcels cluster along the corridor being
      // acquired rather than piling up at one end of it.
      return coords[Math.floor(coords.length / 2)];
    }
  }
  return districtReferencePoint(input.state, input.district);
}

const METERS_PER_DEG_LAT = 111320;

/**
 * Builds an irregular plot of a given extent around a centre. The ring is
 * generated first and then scaled so its true area matches the extent being
 * reported — an officer comparing the stated extent against the drawn
 * boundary should not find them disagreeing.
 */
function plotPolygon(
  center: Position,
  targetHectares: number,
  rng: () => number
): { geometry: PolygonGeometry; areaHectares: number } {
  const [lng0, lat0] = center;
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  const baseRadius = Math.sqrt((targetHectares * 10000) / Math.PI);
  const vertexCount = 4 + Math.floor(rng() * 3); // 4-6 sided, like a real plot

  const offsets: { x: number; y: number }[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * Math.PI * 2 + (rng() - 0.5) * 0.4;
    const radius = baseRadius * (0.74 + rng() * 0.52);
    offsets.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }

  const ringAt = (scale: number): Position[] =>
    offsets.map(
      (o) =>
        [lng0 + (o.x * scale) / metersPerDegLng, lat0 + (o.y * scale) / METERS_PER_DEG_LAT] as Position
    );

  const initialArea = polygonAreaHectares(ringAt(1));
  const scale = initialArea > 0 ? Math.sqrt(targetHectares / initialArea) : 1;
  const ring = ringAt(scale);
  const areaHectares = polygonAreaHectares(ring);

  return {
    geometry: { type: "Polygon", coordinates: [[...ring, ring[0]]] },
    areaHectares,
  };
}

function plotCenterNear(anchor: Position, rng: () => number): Position {
  const [lng0, lat0] = anchor;
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  // Scattered a few hundred metres to ~1.5 km out, so separate documents
  // describe separate plots instead of stacking on one spot.
  const distance = 250 + rng() * 1400;
  const angle = rng() * Math.PI * 2;
  return [
    lng0 + (Math.cos(angle) * distance) / metersPerDegLng,
    lat0 + (Math.sin(angle) * distance) / METERS_PER_DEG_LAT,
  ];
}

/* ── Category-specific readers ────────────────────────────────────────── */

function readCadastralParcel(
  input: ExtractionInput,
  boundaryMethod: "FMB_SKETCH" | "DGPS_SURVEY"
): ExtractedParcelRecord {
  const rng = rngFor(input.documentId, "parcel");
  const village = input.knownVillages?.length
    ? pick(input.knownVillages, rng)
    : pick(VILLAGE_NAMES, rng);
  const targetHectares = 0.18 + rng() * 2.1;
  const center = plotCenterNear(anchorFor(input), rng);
  const { geometry, areaHectares } = plotPolygon(center, targetHectares, rng);

  return {
    village,
    surveyNumber: surveyNumber(rng),
    areaHectares,
    landClassification: pick(LAND_CLASSIFICATION_POOL, rng),
    boundaryMethod,
    geometry,
    adjoiningSurveyNumbers: [surveyNumber(rng), surveyNumber(rng), surveyNumber(rng)],
  };
}

function readTitleholder(input: ExtractionInput): ExtractedFamilyRecord {
  const rng = rngFor(input.documentId, "family");
  const village = input.knownVillages?.length
    ? pick(input.knownVillages, rng)
    : pick(VILLAGE_NAMES, rng);
  const survey = input.knownSurveyNumbers?.length
    ? pick(input.knownSurveyNumbers, rng)
    : surveyNumber(rng);
  const districtCode = input.district.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "GEN";

  return {
    headOfHouseholdName: personName(rng),
    village,
    category: pick(FAMILY_CATEGORY_POOL, rng),
    memberCount: 2 + Math.floor(rng() * 6),
    vulnerableGroup: rng() > 0.68,
    // A patta names the person holding title. That is s.3(c)(i) and nothing
    // else — a tenant or labourer on the same land never appears here.
    entitlementBasis: "S3C_I_LANDOWNER",
    aadhaarMasked: maskedAadhaar(rng),
    rationCardNumber: rationCard(rng),
    pattaNumber: `${districtCode}-PTA-${String(10000 + Math.floor(rng() * 89999))}`,
    surveyNumber: survey,
  };
}

function fieldsFor(
  input: ExtractionInput,
  baseConfidence: number,
  entries: [label: string, value: string, confidenceOffset?: number][]
): ExtractedField[] {
  return entries.map(([label, value, offset = 0]) => ({
    label,
    value,
    confidence: seededConfidence(input.documentId + label, baseConfidence + offset),
  }));
}

/* ── Entry point ──────────────────────────────────────────────────────── */

export function extractDocumentFields(input: ExtractionInput): DocumentExtraction {
  const isScanLike = input.mimeType.startsWith("image/");
  const baseConfidence = isScanLike ? 0.78 : 0.95;
  const jurisdiction = `${input.district}, ${input.state}`;

  switch (input.category) {
    case "FMB_SKETCH":
    case "GPS_SURVEY_REPORT": {
      const isGps = input.category === "GPS_SURVEY_REPORT";
      const parcel = readCadastralParcel(input, isGps ? "DGPS_SURVEY" : "FMB_SKETCH");
      const vertexCount = parcel.geometry.coordinates[0].length - 1;
      // A DGPS survey run for this acquisition is a direct coordinate
      // capture; an FMB sheet is a historical drawing that has to be
      // vectorised and georeferenced, which is genuinely less certain.
      const confidence = isGps ? 0.97 : baseConfidence - 0.04;

      return {
        ...buildExtraction(
          fieldsFor(input, confidence, [
            ["Survey number", parcel.surveyNumber],
            ["Village", parcel.village],
            ["Extent", formatExtent(parcel.areaHectares)],
            ["Classification", landClassificationLabel(parcel.landClassification)],
            [
              isGps ? "Boundary points captured" : "Boundary vertices traced",
              `${vertexCount} points`,
            ],
            ["Adjoining survey numbers", parcel.adjoiningSurveyNumbers.join(", "), -0.05],
            ["Jurisdiction", jurisdiction],
          ]),
          isGps ? "Coordinate table parse (WGS-84)" : "Cadastral sketch vectorisation"
        ),
        parcel,
      };
    }

    case "PATTA_CHITTA": {
      const family = readTitleholder(input);
      return {
        ...buildExtraction(
          fieldsFor(input, baseConfidence, [
            ["Patta number", family.pattaNumber],
            ["Titleholder", family.headOfHouseholdName],
            ["Survey number", family.surveyNumber],
            ["Village", family.village],
            ["Household size", `${family.memberCount} members`, -0.08],
            ["Aadhaar (masked)", family.aadhaarMasked],
            ["Ration card", family.rationCardNumber, -0.04],
            ["Entitlement basis", affectedFamilyBasisLabel(family.entitlementBasis)],
          ]),
          "Revenue record field extraction"
        ),
        family,
        advisories: [
          "A patta names only the titleholder. Tenants, share-croppers, agricultural labourers and long-standing residents on this land are affected families under s.3(c)(ii)–(vi) and must still be identified by the SIA survey.",
        ],
      };
    }

    case "ENCUMBRANCE_CERTIFICATE": {
      const rng = rngFor(input.documentId, "ec");
      const hasCharge = rng() > 0.45;
      const bank = pick(
        ["Indian Bank", "Canara Bank", "Tamil Nadu Grama Bank", "Co-operative Land Development Bank"],
        rng
      );
      const amount = (2 + rng() * 12).toFixed(1);
      return {
        ...buildExtraction(
          fieldsFor(input, baseConfidence, [
            ["Period searched", `${2009 + Math.floor(rng() * 6)} to ${new Date().getFullYear()}`],
            ["Registered transactions", `${1 + Math.floor(rng() * 4)}`],
            ["Subsisting charge", hasCharge ? `Mortgage — ${bank}` : "None"],
            ["Charge amount", hasCharge ? `₹${amount} lakh` : "—", -0.03],
            ["Jurisdiction", jurisdiction],
          ]),
          "Registration record parse"
        ),
        advisories: hasCharge
          ? [
              `A subsisting mortgage in favour of ${bank} was found. Under s.77 the award cannot be paid directly to the landowner until the charge is discharged or the amount is apportioned — record this before marking compensation paid.`,
            ]
          : undefined,
      };
    }

    case "GUIDELINE_VALUE_CERTIFICATE": {
      const rng = rngFor(input.documentId, "gv");
      const ratePerHectare = Math.round((18 + rng() * 42) * 100000);
      return {
        ...buildExtraction(
          fieldsFor(input, baseConfidence, [
            ["Guideline value", `₹${ratePerHectare.toLocaleString("en-IN")} per hectare`],
            ["Classification", landClassificationLabel(pick(LAND_CLASSIFICATION_POOL, rng))],
            ["Effective from", `01-04-${2020 + Math.floor(rng() * 5)}`],
            ["Jurisdiction", jurisdiction],
          ]),
          "Registration record parse"
        ),
        advisories: [
          "s.26 requires the higher of the guideline value, the average of the top 50% of comparable sale deeds, or a consented amount. This certificate establishes only the first of the three.",
        ],
      };
    }

    case "ASSET_VALUATION_REPORT": {
      const rng = rngFor(input.documentId, "assets");
      const trees = 4 + Math.floor(rng() * 40);
      const wells = Math.floor(rng() * 3);
      const structureValue = Math.round((1.2 + rng() * 9) * 100000);
      const treeValue = trees * (1800 + Math.floor(rng() * 4000));
      const wellValue = wells * 85000;
      const total = structureValue + treeValue + wellValue;
      return {
        ...buildExtraction(
          fieldsFor(input, baseConfidence, [
            ["Standing trees", `${trees} (₹${treeValue.toLocaleString("en-IN")})`],
            ["Wells / borewells", `${wells} (₹${wellValue.toLocaleString("en-IN")})`, -0.04],
            ["Structures", `₹${structureValue.toLocaleString("en-IN")}`],
            ["Total asset value", `₹${total.toLocaleString("en-IN")}`],
          ]),
          "Valuation schedule parse"
        ),
        advisories: [
          `s.29 requires the value of assets attached to the land to be added to the award. Enter ₹${total.toLocaleString("en-IN")} as the assets value when assessing compensation for this parcel.`,
        ],
      };
    }

    case "LEGAL_HEIR_CERTIFICATE": {
      const rng = rngFor(input.documentId, "heir");
      const deceased = personName(rng);
      const heirCount = 2 + Math.floor(rng() * 3);
      const heirs = Array.from({ length: heirCount }, () => personName(rng));
      return {
        ...buildExtraction(
          fieldsFor(input, baseConfidence, [
            ["Deceased", deceased],
            ["Heirs recorded", `${heirCount}`],
            ["Names", heirs.join(", "), -0.06],
            ["Issued at", jurisdiction],
          ]),
          "Revenue record field extraction"
        ),
        advisories: [
          "Record succession against the affected family so the award is apportioned among these heirs under s.77 rather than paid to the deceased titleholder.",
        ],
      };
    }

    default: {
      return buildExtraction(
        fieldsFor(input, baseConfidence, [
          ["Document category", input.category.replace(/_/g, " ")],
          ["Project name", input.projectName],
          ["Purpose", input.projectPurpose, -0.05],
          ["Jurisdiction", jurisdiction],
          ["File", `${input.fileName} (${(input.sizeBytes / 1024).toFixed(0)} KB)`],
        ]),
        isScanLike ? "Scanned-image OCR" : "Text-layer extraction"
      );
    }
  }
}

function buildExtraction(
  fields: ExtractedField[],
  method: string
): DocumentExtraction {
  const overallConfidence =
    fields.length === 0
      ? 0
      : fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length;
  return { fields, overallConfidence, method };
}
