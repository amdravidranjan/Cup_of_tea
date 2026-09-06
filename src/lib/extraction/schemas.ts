/**
 * The record grammars, one per document category that carries structured data.
 *
 * These are the contract between the officer and the platform: what a
 * patta extract must contain to be readable, what an FMB sheet must carry to
 * place a plot on the map. The template an officer downloads is generated
 * from these objects, and the validator enforces these objects, so the two
 * cannot drift apart.
 *
 * Field sets are modelled on what the issuing office actually prints. A
 * chitta names the titleholder and the extent but carries no boundary — the
 * shape comes off the FMB sheet — so the two schemas yield different things
 * and are joined on the survey number.
 */

import { LAND_CLASSIFICATIONS, AFFECTED_FAMILY_BASES } from "@/lib/land-records";
import { FAMILY_CATEGORIES } from "@/lib/entitlements";
import type { DocumentCategory } from "@/lib/document-categories";
import type { RecordSchema } from "./types";

/** Patta/chitta extract — the record of rights. Yields the titleholder. */
const PATTA_CHITTA: RecordSchema = {
  category: "PATTA_CHITTA",
  title: "Patta / Chitta / Adangal extract",
  issuedBy: "Revenue Department (taluk office)",
  rowNoun: "titleholder",
  basis: "Record of Rights — identifies who holds the land and how much of it",
  yields: ["FAMILY"],
  fields: [
    {
      name: "pattaNumber",
      label: "Patta Number",
      kind: "pattaNumber",
      required: true,
      description: "The patta under which the land is held.",
      example: "1247",
      aliases: ["Patta No", "Patta No.", "PattaNo"],
    },
    {
      name: "surveyNumber",
      label: "Survey Number",
      kind: "surveyNumber",
      required: true,
      description:
        "The plot this patta covers. This is what links the titleholder to the boundary on the FMB sheet.",
      example: "112/2A",
      aliases: ["Survey No", "Survey No.", "S.No", "SurveyNo", "Field Number"],
    },
    {
      name: "holderName",
      label: "Holder Name",
      kind: "text",
      required: true,
      description: "Name of the person holding the patta, as printed.",
      example: "R. Murugan",
      aliases: ["Name", "Owner Name", "Pattadar", "Pattadar Name", "Holder"],
      max: 120,
    },
    {
      name: "village",
      label: "Village",
      kind: "text",
      required: true,
      description: "Revenue village in which the plot lies.",
      example: "Kizhakku Sirumugai",
      aliases: ["Revenue Village", "Village Name"],
      max: 80,
    },
    {
      name: "extent",
      label: "Extent",
      kind: "extent",
      required: true,
      description:
        "The area held. A bare number is read as hectares; anything else must name its unit.",
      example: "0.8400",
      aliases: ["Area", "Extent (Ha)", "Extent Ha", "Area (Ha)", "Acreage"],
      min: 0.0001,
      max: 10000,
    },
    {
      name: "landClassification",
      label: "Land Classification",
      kind: "enum",
      required: false,
      description:
        "Nanjai (wet), punjai (dry), manavari (rain-fed) or house site. Drives guideline value, so it is not cosmetic.",
      example: "NANJAI",
      enumValues: LAND_CLASSIFICATIONS,
      aliases: ["Classification", "Land Type", "Tharam"],
    },
    {
      name: "category",
      label: "Category",
      kind: "enum",
      required: false,
      description: "Social category of the household, for Schedule II entitlements.",
      example: "landowner",
      enumValues: FAMILY_CATEGORIES,
      aliases: ["Social Category", "Community"],
    },
    {
      name: "memberCount",
      label: "Household Size",
      kind: "integer",
      required: false,
      description: "Number of people in the household.",
      example: "5",
      aliases: ["Members", "Family Members", "No of Members"],
      min: 1,
      max: 50,
    },
    {
      name: "entitlementBasis",
      label: "Entitlement Basis",
      kind: "enum",
      required: false,
      description:
        "Which limb of s.3(c) makes this household an affected family. A patta names a titleholder, so this defaults to S3C_I_LANDOWNER.",
      example: "S3C_I_LANDOWNER",
      enumValues: AFFECTED_FAMILY_BASES,
      aliases: ["Basis", "s.3(c) Basis"],
    },
    {
      name: "aadhaarMasked",
      label: "Aadhaar",
      kind: "aadhaar",
      required: false,
      description:
        "Masked before storage — the full number is never written to the database. A full number here is checksum-verified, then masked.",
      example: "XXXX-XXXX-4417",
      aliases: ["Aadhaar Number", "UID", "Aadhar"],
    },
    {
      name: "rationCardNumber",
      label: "Ration Card",
      kind: "text",
      required: false,
      description: "Ration card number, used to corroborate household size.",
      example: "TN0412876",
      aliases: ["Ration Card Number", "RC Number"],
      max: 30,
    },
    {
      name: "contactPhone",
      label: "Mobile",
      kind: "phone",
      required: false,
      description: "Mobile number for statutory notices.",
      example: "9445012345",
      aliases: ["Phone", "Mobile Number", "Contact"],
    },
  ],
};

/** FMB sketch — the cadastral shape of the plot. Yields the parcel. */
const FMB_SKETCH: RecordSchema = {
  category: "FMB_SKETCH",
  title: "FMB sketch (Field Measurement Book)",
  issuedBy: "Survey & Settlement Department",
  rowNoun: "plot",
  basis: "The cadastral record of the plot's shape, dimensions and adjoining survey numbers",
  yields: ["PARCEL"],
  fields: [
    {
      name: "surveyNumber",
      label: "Survey Number",
      kind: "surveyNumber",
      required: true,
      description: "The plot this sheet measures.",
      example: "112/2A",
      aliases: ["Survey No", "Survey No.", "S.No", "Field Number"],
    },
    {
      name: "village",
      label: "Village",
      kind: "text",
      required: true,
      description: "Revenue village in which the plot lies.",
      example: "Kizhakku Sirumugai",
      aliases: ["Revenue Village", "Village Name"],
      max: 80,
    },
    {
      name: "extent",
      label: "Extent",
      kind: "extent",
      required: true,
      description: "Measured area of the plot. A bare number is read as hectares.",
      example: "0.8400",
      aliases: ["Area", "Extent (Ha)", "Measured Area"],
      min: 0.0001,
      max: 10000,
    },
    {
      name: "boundary",
      label: "Boundary Coordinates",
      kind: "coordinates",
      required: true,
      description:
        "The corners of the plot as longitude latitude pairs, separated by semicolons, walking the boundary in order. The first point need not be repeated at the end.",
      example: "76.9012 11.0341; 76.9021 11.0341; 76.9021 11.0332; 76.9012 11.0332",
      aliases: ["Boundary", "Coordinates", "Corner Points", "Vertices"],
    },
    {
      name: "landClassification",
      label: "Land Classification",
      kind: "enum",
      required: false,
      description: "Nanjai, punjai, manavari or house site.",
      example: "PUNJAI",
      enumValues: LAND_CLASSIFICATIONS,
      aliases: ["Classification", "Land Type", "Tharam"],
    },
    {
      name: "adjoiningSurveyNumbers",
      label: "Adjoining Survey Numbers",
      kind: "text",
      required: false,
      description:
        "The plots this one touches, separated by semicolons. An FMB sheet identifies a plot by its neighbours as much as by its corners.",
      example: "112/1; 112/3; 113/1",
      aliases: ["Adjoining", "Neighbours", "Abutting Survey Numbers"],
      max: 300,
    },
  ],
  rules: [
    {
      name: "boundary-encloses-area",
      check: (row) => {
        const points = row.boundary as [number, number][] | undefined;
        if (!points) return null;
        if (points.length < 3) {
          return "A boundary needs at least three corners to enclose a plot.";
        }
        return null;
      },
    },
    {
      name: "extent-matches-boundary",
      check: (row) => {
        const points = row.boundary as [number, number][] | undefined;
        const stated = row.extent as number | undefined;
        if (!points || points.length < 3 || stated === undefined) return null;
        const computed = shoelaceHectares(points);
        if (computed <= 0) return null;
        // A survey sheet's stated extent and its own corner points should
        // agree. Tolerance is wide because corner points are rounded to four
        // decimals in most extracts, but an order-of-magnitude disagreement
        // means the wrong extent has been typed against the wrong plot.
        const ratio = computed / stated;
        if (ratio < 0.5 || ratio > 2) {
          return `The stated extent (${stated} ha) does not match the area its own boundary encloses (about ${computed.toFixed(4)} ha). One of the two is for a different plot.`;
        }
        return null;
      },
    },
  ],
};

/** DGPS / total-station survey — a re-survey for this acquisition. */
const GPS_SURVEY_REPORT: RecordSchema = {
  ...FMB_SKETCH,
  category: "GPS_SURVEY_REPORT",
  title: "DGPS / total-station survey report",
  basis: "RFCTLARR s.12 — survey and measurement of the land proposed for acquisition",
};

/** Encumbrance certificate — charges that affect apportionment under s.77. */
const ENCUMBRANCE_CERTIFICATE: RecordSchema = {
  category: "ENCUMBRANCE_CERTIFICATE",
  title: "Encumbrance certificate (EC)",
  issuedBy: "Registration Department (Sub-Registrar)",
  rowNoun: "encumbrance",
  basis: "Discloses mortgages and charges that affect apportionment under s.77",
  yields: [],
  fields: [
    {
      name: "surveyNumber",
      label: "Survey Number",
      kind: "surveyNumber",
      required: true,
      description: "The plot the encumbrance attaches to.",
      example: "112/2A",
      aliases: ["Survey No", "S.No"],
    },
    {
      name: "documentNumber",
      label: "Document Number",
      kind: "text",
      required: true,
      description: "Registered document number of the transaction.",
      example: "4471/2019",
      aliases: ["Doc No", "Registration Number"],
      max: 40,
    },
    {
      name: "natureOfDeed",
      label: "Nature of Deed",
      kind: "text",
      required: true,
      description: "Sale, mortgage, gift, partition, lease.",
      example: "Mortgage",
      aliases: ["Deed Type", "Nature"],
      max: 60,
    },
    {
      name: "executedOn",
      label: "Executed On",
      kind: "date",
      required: true,
      description: "Date the deed was executed.",
      example: "14-03-2019",
      aliases: ["Date", "Execution Date"],
    },
    {
      name: "partyName",
      label: "Party Name",
      kind: "text",
      required: true,
      description: "The party in whose favour the charge runs.",
      example: "Coimbatore District Central Co-operative Bank",
      aliases: ["In Favour Of", "Claimant"],
      max: 160,
    },
    {
      name: "amount",
      label: "Amount",
      kind: "decimal",
      required: false,
      description: "Value of the charge, in rupees.",
      example: "450000",
      aliases: ["Value", "Consideration"],
      min: 0,
    },
  ],
};

/** Guideline value — one of the three s.26 tests for market value. */
const GUIDELINE_VALUE_CERTIFICATE: RecordSchema = {
  category: "GUIDELINE_VALUE_CERTIFICATE",
  title: "Guideline value certificate",
  issuedBy: "Registration Department",
  rowNoun: "valuation",
  basis: "RFCTLARR s.26 — one of the three tests for determining market value",
  yields: [],
  fields: [
    {
      name: "surveyNumber",
      label: "Survey Number",
      kind: "surveyNumber",
      required: true,
      description: "The plot valued.",
      example: "112/2A",
      aliases: ["Survey No", "S.No"],
    },
    {
      name: "village",
      label: "Village",
      kind: "text",
      required: true,
      description: "Revenue village.",
      example: "Kizhakku Sirumugai",
      aliases: ["Revenue Village"],
      max: 80,
    },
    {
      name: "guidelineValuePerHectare",
      label: "Guideline Value Per Hectare",
      kind: "decimal",
      required: true,
      description: "Registration-department guideline value, in rupees per hectare.",
      example: "3200000",
      aliases: ["Guideline Value", "Value Per Hectare", "GV"],
      min: 0,
    },
    {
      name: "effectiveFrom",
      label: "Effective From",
      kind: "date",
      required: true,
      description: "Date this guideline value took effect.",
      example: "01-04-2025",
      aliases: ["Effective Date", "With Effect From"],
    },
  ],
};

/** Asset valuation — trees, wells and structures, valued under s.29. */
const ASSET_VALUATION_REPORT: RecordSchema = {
  category: "ASSET_VALUATION_REPORT",
  title: "Asset valuation report",
  issuedBy: "PWD / Agriculture / Horticulture departments",
  rowNoun: "asset",
  basis: "RFCTLARR s.29 — value of assets attached to the land",
  yields: [],
  fields: [
    {
      name: "surveyNumber",
      label: "Survey Number",
      kind: "surveyNumber",
      required: true,
      description: "The plot the asset stands on.",
      example: "112/2A",
      aliases: ["Survey No", "S.No"],
    },
    {
      name: "assetType",
      label: "Asset Type",
      kind: "text",
      required: true,
      description: "Well, farmhouse, coconut trees, compound wall, pump set.",
      example: "Open well with pump set",
      aliases: ["Asset", "Type", "Description"],
      max: 120,
    },
    {
      name: "quantity",
      label: "Quantity",
      kind: "decimal",
      required: true,
      description: "How many, or the measured quantity.",
      example: "1",
      aliases: ["Qty", "Number", "Count"],
      min: 0,
    },
    {
      name: "assessedValue",
      label: "Assessed Value",
      kind: "decimal",
      required: true,
      description: "Departmental valuation of this asset line, in rupees.",
      example: "185000",
      aliases: ["Value", "Amount", "Valuation"],
      min: 0,
    },
    {
      name: "valuedBy",
      label: "Valued By",
      kind: "text",
      required: false,
      description: "Department or officer who valued it.",
      example: "Assistant Executive Engineer, PWD",
      aliases: ["Valuer", "Assessed By"],
      max: 120,
    },
  ],
};

/** Legal heir certificate — apportionment among heirs under s.77. */
const LEGAL_HEIR_CERTIFICATE: RecordSchema = {
  category: "LEGAL_HEIR_CERTIFICATE",
  title: "Legal heir certificate",
  issuedBy: "Revenue Department (Tahsildar)",
  rowNoun: "heir",
  basis: "Apportionment of the award among heirs under s.77",
  yields: [],
  fields: [
    {
      name: "deceasedName",
      label: "Deceased Name",
      kind: "text",
      required: true,
      description: "The titleholder who has died.",
      example: "R. Murugan",
      aliases: ["Deceased", "Late"],
      max: 120,
    },
    {
      name: "pattaNumber",
      label: "Patta Number",
      kind: "pattaNumber",
      required: true,
      description: "The patta whose entitlement is being apportioned.",
      example: "1247",
      aliases: ["Patta No"],
    },
    {
      name: "heirName",
      label: "Heir Name",
      kind: "text",
      required: true,
      description: "Name of the heir.",
      example: "M. Lakshmi",
      aliases: ["Name", "Legal Heir"],
      max: 120,
    },
    {
      name: "relationship",
      label: "Relationship",
      kind: "text",
      required: true,
      description: "How the heir is related to the deceased.",
      example: "Wife",
      aliases: ["Relation"],
      max: 40,
    },
    {
      name: "sharePercent",
      label: "Share Percent",
      kind: "decimal",
      required: true,
      description: "Share of the entitlement, as a percentage. Shares on one patta must total 100.",
      example: "50",
      aliases: ["Share", "Share %", "Percentage"],
      min: 0,
      max: 100,
    },
    {
      name: "contactPhone",
      label: "Mobile",
      kind: "phone",
      required: false,
      description: "Mobile number for the heir.",
      example: "9445012345",
      aliases: ["Phone", "Contact"],
    },
  ],
};

export const RECORD_SCHEMAS: Partial<Record<DocumentCategory, RecordSchema>> = {
  PATTA_CHITTA,
  FMB_SKETCH,
  GPS_SURVEY_REPORT,
  ENCUMBRANCE_CERTIFICATE,
  GUIDELINE_VALUE_CERTIFICATE,
  ASSET_VALUATION_REPORT,
  LEGAL_HEIR_CERTIFICATE,
};

export function schemaFor(category: string): RecordSchema | null {
  return RECORD_SCHEMAS[category as DocumentCategory] ?? null;
}

/** Categories that carry structured, readable data. */
export const READABLE_CATEGORIES = Object.keys(RECORD_SCHEMAS) as DocumentCategory[];

/**
 * Planar area of a lon/lat ring in hectares.
 *
 * The shoelace formula on degrees, with longitude scaled by cos(latitude) so
 * a degree of longitude is not treated as the same ground distance as a
 * degree of latitude. Good to well within the tolerance this is used for —
 * a sanity check on a plot, not a survey computation.
 */
export function shoelaceHectares(points: [number, number][]): number {
  if (points.length < 3) return 0;
  const meanLat = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const metresPerDegreeLat = 110574;
  const metresPerDegreeLon = 111320 * Math.cos((meanLat * Math.PI) / 180);

  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    twiceArea += x1 * metresPerDegreeLon * (y2 * metresPerDegreeLat) -
      x2 * metresPerDegreeLon * (y1 * metresPerDegreeLat);
  }
  return Math.abs(twiceArea / 2) / 10000;
}
