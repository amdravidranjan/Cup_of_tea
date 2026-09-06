/**
 * The document set an acquisition actually runs on.
 *
 * The first ten categories are project-level paperwork (DPR through the
 * possession certificate). The rest are the parcel- and household-level
 * revenue records a Collector's office genuinely works from: the Field
 * Measurement Book sketch held by the Survey & Settlement department, the
 * patta/chitta extract from the taluk office, the encumbrance certificate
 * from the Sub-Registrar, and so on.
 *
 * The distinction that matters here is `yields`. Some of these documents
 * carry structured data — a plot boundary, a titleholder, an extent — that
 * the system can read and turn into an actual record. That is what makes
 * uploading a document an onboarding path rather than a filing cabinet: an
 * officer with an FMB sketch should not have to re-draw the plot by hand,
 * and an officer with a patta extract should not have to re-type the owner.
 */
export const DOCUMENT_CATEGORIES = [
  // Project file
  "DPR",
  "DESIGN_DRAWING",
  "SITE_INVESTIGATION",
  "ROW_PLAN",
  "SIA_REPORT",
  "OTHER",
  "NOTIFICATION",
  "DECLARATION",
  "AWARD_LETTER",
  "POSSESSION_CERTIFICATE",
  // Revenue and cadastral records
  "FMB_SKETCH",
  "GPS_SURVEY_REPORT",
  "PATTA_CHITTA",
  "ENCUMBRANCE_CERTIFICATE",
  "GUIDELINE_VALUE_CERTIFICATE",
  "ASSET_VALUATION_REPORT",
  "LEGAL_HEIR_CERTIFICATE",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

/** A record type a document's contents can be turned into. */
export type DocumentYield = "PARCEL" | "FAMILY";

export interface DocumentCategoryMeta {
  label: string;
  /** The office that actually issues this document in Tamil Nadu. */
  issuedBy: string;
  /** Why it is on the file — the statutory hook or the administrative use. */
  basis: string;
  yields: DocumentYield[];
  group: "Project file" | "Revenue records";
}

export const DOCUMENT_CATEGORY_META: Record<DocumentCategory, DocumentCategoryMeta> = {
  DPR: {
    label: "Detailed Project Report",
    issuedBy: "Requiring body",
    basis: "Establishes public purpose and scope before acquisition begins",
    yields: [],
    group: "Project file",
  },
  DESIGN_DRAWING: {
    label: "Design drawings",
    issuedBy: "Requiring body / PWD",
    basis: "Defines the built footprint the land is needed for",
    yields: [],
    group: "Project file",
  },
  SITE_INVESTIGATION: {
    label: "Site investigation report",
    issuedBy: "Requiring body",
    basis: "Ground conditions supporting the alignment",
    yields: [],
    group: "Project file",
  },
  ROW_PLAN: {
    label: "Right-of-way / land plan",
    issuedBy: "Requiring body",
    basis: "The corridor for which land is sought",
    yields: [],
    group: "Project file",
  },
  SIA_REPORT: {
    label: "Social Impact Assessment report",
    issuedBy: "SIA unit / appraising agency",
    basis: "RFCTLARR s.4–6 — mandatory before notification",
    yields: [],
    group: "Project file",
  },
  NOTIFICATION: {
    label: "Preliminary notification (Gazette)",
    issuedBy: "District Collector",
    basis: "RFCTLARR s.11(1) — freezes transactions on the notified land",
    yields: [],
    group: "Project file",
  },
  DECLARATION: {
    label: "Declaration and R&R summary",
    issuedBy: "State Government / Collector",
    basis: "RFCTLARR s.19 — declaration of intended acquisition",
    yields: [],
    group: "Project file",
  },
  AWARD_LETTER: {
    label: "Award",
    issuedBy: "District Collector",
    basis: "RFCTLARR s.23 and s.30 — compensation determined and announced",
    yields: [],
    group: "Project file",
  },
  POSSESSION_CERTIFICATE: {
    label: "Possession certificate",
    issuedBy: "District Collector",
    basis: "RFCTLARR s.38 — land vests in the Government",
    yields: [],
    group: "Project file",
  },
  OTHER: {
    label: "Other",
    issuedBy: "—",
    basis: "Anything else placed on the file",
    yields: [],
    group: "Project file",
  },

  FMB_SKETCH: {
    label: "FMB sketch (Field Measurement Book)",
    issuedBy: "Survey & Settlement Department",
    basis: "The cadastral record of the plot's shape, dimensions and adjoining survey numbers",
    yields: ["PARCEL"],
    group: "Revenue records",
  },
  GPS_SURVEY_REPORT: {
    label: "DGPS / total-station survey report",
    issuedBy: "Survey & Settlement Department",
    basis: "RFCTLARR s.12 — survey and measurement of the land proposed for acquisition",
    yields: ["PARCEL"],
    group: "Revenue records",
  },
  PATTA_CHITTA: {
    label: "Patta / Chitta / Adangal extract",
    issuedBy: "Revenue Department (taluk office)",
    // A patta states who holds the land and how much of it, but carries no
    // boundary diagram — the shape comes from the FMB sheet, not from here.
    basis: "Record of Rights — identifies the titleholder and the extent held",
    yields: ["FAMILY"],
    group: "Revenue records",
  },
  ENCUMBRANCE_CERTIFICATE: {
    label: "Encumbrance certificate (EC)",
    issuedBy: "Registration Department (Sub-Registrar)",
    basis: "Discloses mortgages and charges that affect apportionment under s.77",
    yields: [],
    group: "Revenue records",
  },
  GUIDELINE_VALUE_CERTIFICATE: {
    label: "Guideline value certificate",
    issuedBy: "Registration Department",
    basis: "RFCTLARR s.26 — one of the three tests for determining market value",
    yields: [],
    group: "Revenue records",
  },
  ASSET_VALUATION_REPORT: {
    label: "Asset valuation report (trees, wells, structures)",
    issuedBy: "PWD / Agriculture / Horticulture departments",
    basis: "RFCTLARR s.29 — value of assets attached to the land",
    yields: [],
    group: "Revenue records",
  },
  LEGAL_HEIR_CERTIFICATE: {
    label: "Legal heir certificate",
    issuedBy: "Revenue Department (Tahsildar)",
    basis: "Apportionment of the award among heirs under s.77",
    yields: [],
    group: "Revenue records",
  },
};

/** Tolerant of historical rows: `documents.category` is free text in the
 *  database, so a value that predates this list still renders readably. */
export function documentCategoryLabel(category: string): string {
  return (
    DOCUMENT_CATEGORY_META[category as DocumentCategory]?.label ??
    category.replace(/_/g, " ")
  );
}

export function documentCategoryMeta(category: string): DocumentCategoryMeta | null {
  return DOCUMENT_CATEGORY_META[category as DocumentCategory] ?? null;
}

export function documentYields(category: string): DocumentYield[] {
  return DOCUMENT_CATEGORY_META[category as DocumentCategory]?.yields ?? [];
}
