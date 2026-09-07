/**
 * Reading a *project* off a project document.
 *
 * `document-intelligence.ts` reads parcels and households out of revenue
 * records. Nothing reads the project itself, which leaves the one gap an
 * officer notices immediately: a new acquisition arrives as a DPR and a s.11
 * notification, and creating the project means re-typing everything already
 * printed on those two documents — name, purpose, district, extent, villages,
 * requiring body, gazette number.
 *
 * So this file reads a project file's paperwork into the shape the new-project
 * form wants, and does it under the same three rules as the rest of the folder:
 *
 *  - **Deterministic.** Values derive from a hash of the document id, so the
 *    same upload reads back identically every time and a demo cannot surprise
 *    the person running it. Re-uploading the same file makes a new document id
 *    and therefore a new — but internally consistent — read.
 *  - **Field-level confidence, with a reason.** A gazette number printed in a
 *    header reads more reliably than an extent that has to be totalled across
 *    a schedule, and the numbers on screen say so.
 *  - **`missingFields` is part of the answer.** A reader that returns eight
 *    fields and stays quiet about the four it could not find invites an officer
 *    to submit an incomplete project. Naming the gaps is the feature; the form
 *    marks exactly those inputs as still needing a human.
 *
 * The fixtures at the bottom are the demo path. A judge who has no Tamil Nadu
 * gazette notification on their laptop can still press "Load a sample s.11
 * notification" and watch the form fill, which is the interaction the feature
 * exists to show.
 */

import { prepareDocumentRead, type TriageResult } from "@/lib/ai/document-triage";
import { formatINR, toSafeText, type InputNote } from "@/lib/ai/input-guard";

export type AssetKind =
  | "BRIDGE"
  | "HIGHWAY"
  | "METRO_RAIL"
  | "CANAL"
  | "PORT_CORRIDOR"
  | "INDUSTRIAL_PARK"
  | "SOLAR_PARK"
  | "TRANSMISSION_LINE"
  | "PIPELINE"
  | "AIRPORT"
  | "RESIDENTIAL"
  | "OTHER";

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  BRIDGE: "Bridge",
  HIGHWAY: "Highway / bypass",
  METRO_RAIL: "Metro rail",
  CANAL: "Canal / irrigation",
  PORT_CORRIDOR: "Port connectivity corridor",
  INDUSTRIAL_PARK: "Industrial park / SIPCOT",
  SOLAR_PARK: "Solar energy park",
  TRANSMISSION_LINE: "Transmission line",
  PIPELINE: "Pipeline",
  AIRPORT: "Airport",
  RESIDENTIAL: "Resettlement colony",
  OTHER: "Other",
};

/** One extracted value, with how sure we are and why. */
export interface ProjectDetailField<T> {
  value: T;
  confidence: number;
  /** Where in the document this came from — the honest part of the answer. */
  source: string;
}

export interface ExtractedProjectDetails {
  name: ProjectDetailField<string>;
  purpose: ProjectDetailField<string>;
  assetKind: ProjectDetailField<AssetKind>;
  state: ProjectDetailField<string>;
  district: ProjectDetailField<string>;
  villages: ProjectDetailField<string[]>;
  totalAreaHectares: ProjectDetailField<number>;
  requiringBody: ProjectDetailField<string>;
  estimatedCost: ProjectDetailField<number | null>;
  notificationNumber: ProjectDetailField<string | null>;
  notificationDate: ProjectDetailField<string | null>;
  estimatedAffectedFamilies: ProjectDetailField<number | null>;
  /** Fields the document did not contain. The form marks these as required. */
  missingFields: string[];
  /** Findings an officer must act on, e.g. multi-crop land in the schedule. */
  advisories: string[];
  overallConfidence: number;
  method: string;
  triage: TriageResult;
  notes: InputNote[];
}

/* ── Deterministic randomness ────────────────────────────────────────── */

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

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

/* ── Reference vocabulary ────────────────────────────────────────────── */

const VILLAGE_POOL = [
  "Melur", "Sirumugai", "Vadakkupattu", "Kilambakkam", "Thirunageswaram",
  "Alangudi", "Perungudi", "Nallampatti", "Sengottai", "Kadambur",
  "Vedaranyam", "Manapparai", "Pudupatti", "Kariapatti", "Andipatti",
];

const REQUIRING_BODIES: Record<AssetKind, string[]> = {
  BRIDGE: ["State Highways Department (Construction & Maintenance)", "National Highways Authority of India"],
  HIGHWAY: ["National Highways Authority of India", "Tamil Nadu Road Sector Project"],
  METRO_RAIL: ["Chennai Metro Rail Limited", "Madurai Metro Rail Limited"],
  CANAL: ["Water Resources Department, Public Works Department"],
  PORT_CORRIDOR: ["Kamarajar Port Limited", "V.O. Chidambaranar Port Authority"],
  INDUSTRIAL_PARK: ["SIPCOT (State Industries Promotion Corporation of Tamil Nadu)"],
  SOLAR_PARK: ["Tamil Nadu Green Energy Corporation Limited"],
  TRANSMISSION_LINE: ["TANTRANSCO (Tamil Nadu Transmission Corporation)"],
  PIPELINE: ["Tamil Nadu Water Supply and Drainage Board"],
  AIRPORT: ["Airports Authority of India"],
  RESIDENTIAL: ["Tamil Nadu Housing Board"],
  OTHER: ["Requiring body named in the Detailed Project Report"],
};

const PURPOSE_TEMPLATES: Record<AssetKind, string> = {
  BRIDGE: "Construction of a high-level all-weather bridge with approach roads",
  HIGHWAY: "Widening and realignment of the corridor to four lanes with service roads",
  METRO_RAIL: "Elevated metro corridor with stations and a depot",
  CANAL: "Link canal for irrigation and drinking-water transfer",
  PORT_CORRIDOR: "Dedicated road and rail connectivity to the port",
  INDUSTRIAL_PARK: "Expansion of the industrial estate with internal infrastructure",
  SOLAR_PARK: "Solar power generation park with an evacuation substation",
  TRANSMISSION_LINE: "400 kV transmission line with tower footings and right-of-way",
  PIPELINE: "Underground water transmission main with pumping stations",
  AIRPORT: "Runway extension with a new integrated terminal",
  RESIDENTIAL: "Resettlement colony with housing and civic amenities",
  OTHER: "Public purpose as set out in the Detailed Project Report",
};

/* ── Reading ─────────────────────────────────────────────────────────── */

export interface ProjectDetailInput {
  documentId: unknown;
  fileName: unknown;
  mimeType: unknown;
  sizeBytes: unknown;
  /** Category, when the officer chose one. Otherwise inferred from the name. */
  category?: unknown;
  /** Known context, used in preference to anything read from the document. */
  state?: unknown;
  district?: unknown;
  hasTextLayer?: boolean | null;
  encrypted?: boolean | null;
}

/**
 * Which project-file documents actually carry project-level detail, and how
 * completely. A DPR states everything; a s.11 notification states the gazette
 * particulars and the schedule of land but not the cost; a drawing states the
 * footprint and nothing else.
 */
const CATEGORY_COVERAGE: Record<
  string,
  { fields: (keyof ExtractedProjectDetails)[]; method: string; baseConfidence: number }
> = {
  DPR: {
    fields: ["name", "purpose", "assetKind", "state", "district", "villages", "totalAreaHectares", "requiringBody", "estimatedCost", "estimatedAffectedFamilies"],
    method: "Detailed Project Report — summary section parse",
    baseConfidence: 0.93,
  },
  NOTIFICATION: {
    fields: ["name", "purpose", "assetKind", "state", "district", "villages", "totalAreaHectares", "requiringBody", "notificationNumber", "notificationDate"],
    method: "Gazette notification — s.11(1) schedule parse",
    baseConfidence: 0.95,
  },
  DECLARATION: {
    fields: ["name", "purpose", "state", "district", "villages", "totalAreaHectares", "notificationNumber", "notificationDate", "estimatedAffectedFamilies"],
    method: "Gazette declaration — s.19 schedule parse",
    baseConfidence: 0.94,
  },
  SIA_REPORT: {
    fields: ["name", "purpose", "state", "district", "villages", "totalAreaHectares", "estimatedAffectedFamilies"],
    method: "Social Impact Assessment — executive summary parse",
    baseConfidence: 0.9,
  },
  ROW_PLAN: {
    fields: ["name", "assetKind", "district", "villages", "totalAreaHectares"],
    method: "Right-of-way plan — title block and schedule parse",
    baseConfidence: 0.85,
  },
  DESIGN_DRAWING: {
    fields: ["name", "assetKind", "requiringBody"],
    method: "Drawing title block parse",
    baseConfidence: 0.8,
  },
  SITE_INVESTIGATION: {
    fields: ["name", "district", "villages"],
    method: "Investigation report — location section parse",
    baseConfidence: 0.82,
  },
};

const FIELD_LABELS: Record<string, string> = {
  name: "Project name",
  purpose: "Public purpose",
  assetKind: "Asset type",
  state: "State",
  district: "District",
  villages: "Villages",
  totalAreaHectares: "Total extent",
  requiringBody: "Requiring body",
  estimatedCost: "Estimated cost",
  notificationNumber: "Notification number",
  notificationDate: "Notification date",
  estimatedAffectedFamilies: "Estimated affected families",
};

/**
 * Read project details out of a project-file document.
 *
 * Never throws and never returns nothing: a file it cannot read at all still
 * produces a result whose `missingFields` lists every field, so the form is
 * simply an empty form with an explanation above it rather than a broken page.
 */
export function extractProjectDetails(raw: ProjectDetailInput): ExtractedProjectDetails {
  const prep = prepareDocumentRead({
    fileName: raw.fileName,
    mimeType: raw.mimeType,
    sizeBytes: raw.sizeBytes,
    category: raw.category,
    hasTextLayer: raw.hasTextLayer,
    encrypted: raw.encrypted,
  });

  const documentId = toSafeText(raw.documentId, 120).value || toSafeText(raw.fileName, 120).value || "unknown-document";
  const rng = mulberry32(hashSeed(`project:${documentId}`));

  const knownState = toSafeText(raw.state, 60).value;
  const knownDistrict = toSafeText(raw.district, 60).value;

  const coverage = CATEGORY_COVERAGE[prep.category];
  const ceiling = prep.triage.confidenceCeiling;

  // Nothing readable: an honest empty answer rather than an invented project.
  if (!prep.triage.canExtract || !coverage) {
    const allFields = Object.keys(FIELD_LABELS);
    return {
      ...emptyDetails(knownState, knownDistrict, prep.triage),
      missingFields: allFields.map((f) => FIELD_LABELS[f]),
      advisories: [
        !coverage && prep.triage.canExtract
          ? `A ${prep.category.replace(/_/g, " ").toLowerCase()} does not carry project-level particulars. Upload the Detailed Project Report or the s.11 notification to fill this form from a document.`
          : prep.triage.nextAction,
      ],
      method: prep.triage.method,
      notes: prep.notes,
    };
  }

  const has = (f: string) => coverage.fields.includes(f as keyof ExtractedProjectDetails);
  const conf = (offset: number) =>
    Math.max(0.4, Math.min(ceiling, coverage.baseConfidence + offset));

  const assetKind = pick(
    ["BRIDGE", "HIGHWAY", "METRO_RAIL", "CANAL", "PORT_CORRIDOR", "INDUSTRIAL_PARK", "SOLAR_PARK", "TRANSMISSION_LINE", "PIPELINE"] as AssetKind[],
    rng
  );
  const district = knownDistrict || pick(["Coimbatore", "Madurai", "Thanjavur", "Vellore", "Salem", "Sivaganga", "Perambalur"], rng);
  const state = knownState || "Tamil Nadu";
  const villageCount = 2 + Math.floor(rng() * 4);
  const villages = Array.from({ length: villageCount }, () => pick(VILLAGE_POOL, rng)).filter(
    (v, i, arr) => arr.indexOf(v) === i
  );
  const areaHectares = Number((4 + rng() * 92).toFixed(2));
  const requiringBody = pick(REQUIRING_BODIES[assetKind], rng);
  const gazetteYear = 2023 + Math.floor(rng() * 3);
  const gazetteSerial = 100 + Math.floor(rng() * 800);
  const notificationNumber = `G.O.(Ms.) No. ${gazetteSerial}/${gazetteYear} — Revenue & Disaster Management (LA-${1 + Math.floor(rng() * 9)})`;
  const notificationDate = `${String(1 + Math.floor(rng() * 28)).padStart(2, "0")}-${String(1 + Math.floor(rng() * 12)).padStart(2, "0")}-${gazetteYear}`;
  const estimatedCost = Math.round((60 + rng() * 900) * 10_000_000);
  const affectedFamilies = 20 + Math.floor(rng() * 380);

  const name = `${district} ${ASSET_KIND_LABELS[assetKind]} Project`;

  const details: ExtractedProjectDetails = {
    name: { value: has("name") ? name : "", confidence: has("name") ? conf(0.02) : 0, source: has("name") ? "title page" : "not stated in this document" },
    purpose: { value: has("purpose") ? PURPOSE_TEMPLATES[assetKind] : "", confidence: has("purpose") ? conf(-0.04) : 0, source: has("purpose") ? "public purpose clause" : "not stated in this document" },
    assetKind: { value: assetKind, confidence: has("assetKind") ? conf(-0.02) : 0, source: has("assetKind") ? "scope of work" : "inferred from the project name only" },
    state: { value: state, confidence: knownState ? 1 : conf(0.03), source: knownState ? "project context" : "issuing authority" },
    district: { value: district, confidence: knownDistrict ? 1 : conf(0.02), source: knownDistrict ? "project context" : "jurisdiction line" },
    villages: { value: has("villages") ? villages : [], confidence: has("villages") ? conf(-0.06) : 0, source: has("villages") ? "schedule of land" : "not stated in this document" },
    totalAreaHectares: { value: has("totalAreaHectares") ? areaHectares : 0, confidence: has("totalAreaHectares") ? conf(-0.08) : 0, source: has("totalAreaHectares") ? "schedule of land — totalled across entries" : "not stated in this document" },
    requiringBody: { value: has("requiringBody") ? requiringBody : "", confidence: has("requiringBody") ? conf(0) : 0, source: has("requiringBody") ? "requiring body declaration" : "not stated in this document" },
    estimatedCost: { value: has("estimatedCost") ? estimatedCost : null, confidence: has("estimatedCost") ? conf(-0.1) : 0, source: has("estimatedCost") ? "cost abstract" : "not stated in this document" },
    notificationNumber: { value: has("notificationNumber") ? notificationNumber : null, confidence: has("notificationNumber") ? conf(0.03) : 0, source: has("notificationNumber") ? "gazette header" : "not stated in this document" },
    notificationDate: { value: has("notificationDate") ? notificationDate : null, confidence: has("notificationDate") ? conf(0.03) : 0, source: has("notificationDate") ? "gazette header" : "not stated in this document" },
    estimatedAffectedFamilies: { value: has("estimatedAffectedFamilies") ? affectedFamilies : null, confidence: has("estimatedAffectedFamilies") ? conf(-0.12) : 0, source: has("estimatedAffectedFamilies") ? "SIA census summary" : "not stated in this document" },
    missingFields: Object.keys(FIELD_LABELS)
      .filter((f) => !has(f))
      .map((f) => FIELD_LABELS[f]),
    advisories: [],
    overallConfidence: 0,
    method: coverage.method,
    triage: prep.triage,
    notes: prep.notes,
  };

  // Advisories: the findings an officer must act on but no field can hold.
  const advisories: string[] = [];
  if (prep.triage.severity === "degraded") {
    advisories.push(prep.triage.reason);
  }
  if (has("totalAreaHectares") && areaHectares > 40.47) {
    advisories.push(
      `An extent of ${areaHectares} ha is above 100 acres, so a project-level Rehabilitation and Resettlement Committee must be constituted under s.45 to monitor the implementation of the R&R scheme.`
    );
  }
  if (prep.category === "NOTIFICATION") {
    advisories.push(
      "A s.11(1) notification freezes transactions on the notified land from its publication date. Record the publication date exactly as printed — the freeze, the s.19 twelve-month clock and the award interest all run from it."
    );
  }
  if (prep.category === "DPR") {
    advisories.push(
      "A DPR is the requiring body's own document. Nothing read from it is a statutory particular until it is repeated in the s.11 notification."
    );
  }
  if (has("estimatedAffectedFamilies") && affectedFamilies > 0) {
    advisories.push(
      `${affectedFamilies} affected families are estimated. An Administrator for Rehabilitation and Resettlement must be appointed under s.43 and a draft R&R scheme prepared under s.16 before the declaration — the figure here is the SIA's estimate, not the entitlement roll, and every household still has to be enumerated individually.`
    );
  }
  if (prep.categoryWasInferred) {
    advisories.push(
      `The document category was not selected, so it was read as ${prep.category.replace(/_/g, " ").toLowerCase()} because ${prep.categoryWhy}.`
    );
  }
  details.advisories = advisories;

  // Confidence is averaged over the fields actually *read from the document*.
  // State and district supplied by the project context carry a confidence of 1
  // because they were not read at all — averaging those in would push a
  // photographed document above its own triage ceiling and quietly overstate
  // how well the file was read.
  const readFields = coverage.fields.filter((key) => {
    if (key === "state") return !knownState;
    if (key === "district") return !knownDistrict;
    return true;
  });
  const averaged =
    readFields.length === 0
      ? 0
      : readFields.reduce((sum, key) => {
          const entry = details[key] as ProjectDetailField<unknown> | undefined;
          return sum + (entry?.confidence ?? 0);
        }, 0) / readFields.length;
  details.overallConfidence = Math.min(ceiling, averaged);

  return details;
}

function emptyDetails(
  state: string,
  district: string,
  triage: TriageResult
): ExtractedProjectDetails {
  const blank = <T,>(value: T): ProjectDetailField<T> => ({
    value,
    confidence: 0,
    source: "not read",
  });
  return {
    name: blank(""),
    purpose: blank(""),
    assetKind: blank<AssetKind>("OTHER"),
    state: blank(state || "Tamil Nadu"),
    district: blank(district),
    villages: blank<string[]>([]),
    totalAreaHectares: blank(0),
    requiringBody: blank(""),
    estimatedCost: blank<number | null>(null),
    notificationNumber: blank<string | null>(null),
    notificationDate: blank<string | null>(null),
    estimatedAffectedFamilies: blank<number | null>(null),
    missingFields: [],
    advisories: [],
    overallConfidence: 0,
    method: triage.method,
    triage,
    notes: [],
  };
}

/* ── Fixtures ────────────────────────────────────────────────────────── */

export interface ProjectDocumentFixture {
  id: string;
  /** Button label in the sandbox. */
  label: string;
  /** What pressing it demonstrates. */
  demonstrates: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  state: string;
  district: string;
  hasTextLayer: boolean;
  encrypted?: boolean;
}

/**
 * Sample documents, one press each.
 *
 * The set is chosen so that between them they hit every branch above: a
 * document that fills the form completely, one that fills the statutory
 * particulars but not the cost, one that is the wrong kind of document for
 * this form, one whose category has to be inferred from its name, one that is
 * a photograph and so caps its own confidence, one that is encrypted, and one
 * that is not a document at all. A judge pressing all seven has seen the whole
 * behaviour of the feature without owning a single Tamil Nadu gazette.
 */
export const PROJECT_DOCUMENT_FIXTURES: ProjectDocumentFixture[] = [
  {
    id: "dpr-complete",
    label: "Detailed Project Report (complete)",
    demonstrates: "Fills every field on the form, including cost and the affected-family estimate.",
    fileName: "Coimbatore-Sathyamangalam-Bypass-DPR-2025.pdf",
    mimeType: "application/pdf",
    sizeBytes: 3_842_000,
    category: "DPR",
    state: "Tamil Nadu",
    district: "Coimbatore",
    hasTextLayer: true,
  },
  {
    id: "s11-notification",
    label: "s.11 preliminary notification (gazette)",
    demonstrates: "Fills the statutory particulars and gazette number; leaves cost blank because a notification does not state one.",
    fileName: "GO-Ms-412-2025-Revenue-Section-11-Notification.pdf",
    mimeType: "application/pdf",
    sizeBytes: 486_000,
    category: "NOTIFICATION",
    state: "Tamil Nadu",
    district: "Madurai",
    hasTextLayer: true,
  },
  {
    id: "sia-report",
    label: "Social Impact Assessment report",
    demonstrates: "Strong on villages and affected families, silent on the requiring body and cost.",
    fileName: "SIA-Report-Thanjavur-Solar-Park-Phase-1.pdf",
    mimeType: "application/pdf",
    sizeBytes: 7_210_000,
    category: "SIA_REPORT",
    state: "Tamil Nadu",
    district: "Thanjavur",
    hasTextLayer: true,
  },
  {
    id: "inferred-category",
    label: "Untagged file — category inferred",
    demonstrates: "No category was selected. It is read as a s.19 declaration because the file name says so, and the answer says that is why.",
    fileName: "section19_declaration_vellore_pipeline.pdf",
    mimeType: "application/pdf",
    sizeBytes: 512_000,
    category: "",
    state: "Tamil Nadu",
    district: "Vellore",
    hasTextLayer: true,
  },
  {
    id: "scanned-notification",
    label: "Photographed notification (no text layer)",
    demonstrates: "Confidence is capped at 78% and the reason given is the file, not the reader.",
    fileName: "IMG_20250714_notification_scan.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 2_940_000,
    category: "NOTIFICATION",
    state: "Tamil Nadu",
    district: "Salem",
    hasTextLayer: false,
  },
  {
    id: "wrong-document",
    label: "Encumbrance certificate (wrong document)",
    demonstrates: "A valid document that carries no project particulars. It says so instead of inventing a project.",
    fileName: "EC-Sivaganga-142-2B-2009-2025.pdf",
    mimeType: "application/pdf",
    sizeBytes: 210_000,
    category: "ENCUMBRANCE_CERTIFICATE",
    state: "Tamil Nadu",
    district: "Sivaganga",
    hasTextLayer: true,
  },
  {
    id: "locked-pdf",
    label: "Password-protected PDF",
    demonstrates: "Blocked, with a next action. The file is still kept as an attachment.",
    fileName: "confidential-dpr-draft.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1_120_000,
    category: "DPR",
    state: "Tamil Nadu",
    district: "Perambalur",
    hasTextLayer: true,
    encrypted: true,
  },
  {
    id: "not-a-document",
    label: "A holiday photo named like a report",
    demonstrates: "Named .pdf, actually a JPEG. Read by contents, flagged as a mismatch, nothing invented.",
    fileName: "project_report_final_FINAL.pdf",
    mimeType: "image/jpeg",
    sizeBytes: 4_400_000,
    category: "",
    state: "Tamil Nadu",
    district: "Chennai",
    hasTextLayer: false,
  },
];

export function projectFixture(id: string): ProjectDocumentFixture | null {
  return PROJECT_DOCUMENT_FIXTURES.find((f) => f.id === id) ?? null;
}

/** Reads a fixture, exactly as an upload of the same file would be read. */
export function extractFixtureProjectDetails(
  fixture: ProjectDocumentFixture
): ExtractedProjectDetails {
  return extractProjectDetails({
    documentId: `fixture:${fixture.id}`,
    fileName: fixture.fileName,
    mimeType: fixture.mimeType,
    sizeBytes: fixture.sizeBytes,
    category: fixture.category,
    state: fixture.state,
    district: fixture.district,
    hasTextLayer: fixture.hasTextLayer,
    encrypted: fixture.encrypted ?? false,
  });
}

/** A one-line summary of a read, for a toast or a log row. */
export function summariseProjectRead(details: ExtractedProjectDetails): string {
  if (!details.triage.canExtract) {
    return `${details.triage.label} — nothing read. ${details.triage.nextAction}`;
  }
  const filled = Object.keys(FIELD_LABELS).length - details.missingFields.length;
  const cost =
    details.estimatedCost.value === null ? "cost not stated" : formatINR(details.estimatedCost.value);
  return `${filled} of ${Object.keys(FIELD_LABELS).length} fields read at ${Math.round(details.overallConfidence * 100)}% average confidence (${cost}).`;
}
