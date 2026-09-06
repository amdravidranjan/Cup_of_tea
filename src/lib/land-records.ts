// Real Indian revenue-village cadastral notation: a survey number is
// often subdivided ("142/3B") when the original plot was split across
// multiple holdings over time — so numbers group in small clusters
// sharing a base, not one clean sequence per parcel. Patta numbers
// (the ownership record of rights) reset per district.

import type { Position } from "./geo";

export function surveyNumberFor(indexWithinVillage: number): string {
  const base = 100 + Math.floor(indexWithinVillage / 3);
  const sub = (indexWithinVillage % 3) + 1;
  return `${base}/${sub}`;
}

export function pattaNumberFor(district: string, globalIndex: number): string {
  const code = district.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "GEN";
  return `${code}-PTA-${String(globalIndex + 1).padStart(5, "0")}`;
}

/* ── Land classification ──────────────────────────────────────────────
 * Tamil Nadu revenue records classify agricultural land by its water
 * source, and the classification drives the guideline value — wet land is
 * worth materially more than dry land of the same extent, so it is not a
 * cosmetic label. */

export const LAND_CLASSIFICATIONS = ["NANJAI", "PUNJAI", "MANAVARI", "HOUSE_SITE"] as const;
export type LandClassification = (typeof LAND_CLASSIFICATIONS)[number];

export const LAND_CLASSIFICATION_LABELS: Record<LandClassification, string> = {
  NANJAI: "Nanjai (wet — canal/tank irrigated)",
  PUNJAI: "Punjai (dry — unirrigated)",
  MANAVARI: "Manavari (rain-fed)",
  HOUSE_SITE: "House site (natham/residential)",
};

export function landClassificationLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return LAND_CLASSIFICATION_LABELS[value as LandClassification] ?? value;
}

/* ── How the boundary was established ─────────────────────────────────
 * An officer defending an award needs to say where the boundary on record
 * came from. A DGPS survey done for this acquisition is stronger evidence
 * than a historical FMB sketch, which in turn is stronger than a line
 * somebody drew on a map. */

export const BOUNDARY_METHODS = ["DGPS_SURVEY", "FMB_SKETCH", "MANUAL_DRAWING"] as const;
export type BoundaryMethod = (typeof BOUNDARY_METHODS)[number];

export const BOUNDARY_METHOD_LABELS: Record<BoundaryMethod, string> = {
  DGPS_SURVEY: "DGPS / total-station survey",
  FMB_SKETCH: "FMB sketch (cadastral record)",
  MANUAL_DRAWING: "Drawn on map by officer",
};

export function boundaryMethodLabel(value: string | null | undefined): string {
  if (!value) return "Drawn on map by officer";
  return BOUNDARY_METHOD_LABELS[value as BoundaryMethod] ?? value;
}

/* ── Who counts as an affected family ─────────────────────────────────
 * Section 3(c) of the RFCTLARR Act 2013 defines "affected family" far more
 * widely than "the person named on the patta". Tenants, share-croppers,
 * agricultural labourers, forest dwellers and long-standing residents all
 * qualify without holding title — which is precisely why the Act mandates
 * a door-to-door Social Impact Assessment instead of letting the revenue
 * record stand as the list of affected people. Recording which clause a
 * family qualifies under is what makes a non-titleholder's entitlement
 * defensible when the award is challenged. */

export const AFFECTED_FAMILY_BASES = [
  "S3C_I_LANDOWNER",
  "S3C_II_LIVELIHOOD",
  "S3C_III_FOREST_RIGHTS",
  "S3C_IV_FOREST_WATER_DEPENDENT",
  "S3C_V_ASSIGNED_LAND",
  "S3C_VI_URBAN_RESIDENT",
] as const;
export type AffectedFamilyBasis = (typeof AFFECTED_FAMILY_BASES)[number];

export const AFFECTED_FAMILY_BASIS_LABELS: Record<AffectedFamilyBasis, string> = {
  S3C_I_LANDOWNER: "s.3(c)(i) — land or immovable property acquired",
  S3C_II_LIVELIHOOD:
    "s.3(c)(ii) — no land held; agricultural labourer, tenant, share-cropper or artisan of 3+ years",
  S3C_III_FOREST_RIGHTS: "s.3(c)(iii) — Scheduled Tribe / forest rights lost under the FRA 2006",
  S3C_IV_FOREST_WATER_DEPENDENT:
    "s.3(c)(iv) — livelihood dependent on forest or water bodies for 3+ years",
  S3C_V_ASSIGNED_LAND: "s.3(c)(v) — land assigned under a Government scheme is under acquisition",
  S3C_VI_URBAN_RESIDENT: "s.3(c)(vi) — resident of the affected urban land for 3+ years",
};

export function affectedFamilyBasisLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return AFFECTED_FAMILY_BASIS_LABELS[value as AffectedFamilyBasis] ?? value;
}

/** How a family entered the record. A family read off a land record is only
 *  ever a titleholder; everyone else has to be found by the survey. */
export const FAMILY_SOURCES = ["LAND_RECORD", "SIA_SURVEY", "FIELD_VERIFICATION"] as const;
export type FamilySource = (typeof FAMILY_SOURCES)[number];

export const FAMILY_SOURCE_LABELS: Record<FamilySource, string> = {
  LAND_RECORD: "From land record",
  SIA_SURVEY: "From SIA survey",
  FIELD_VERIFICATION: "From field verification",
};

export function familySourceLabel(value: string | null | undefined): string {
  if (!value) return FAMILY_SOURCE_LABELS.SIA_SURVEY;
  return FAMILY_SOURCE_LABELS[value as FamilySource] ?? value;
}

/* ── Where a district sits ────────────────────────────────────────────
 * A parcel read out of a document has to be placed somewhere on the map.
 * When the project has no alignment drawn yet (a brand-new project has
 * none), the district headquarters is the anchor. Approximate district
 * centres, good to a few kilometres — enough to put a plot in the right
 * district, not a substitute for the survey coordinates themselves. */

const DISTRICT_REFERENCE_POINTS: Record<string, Position> = {
  Chennai: [80.2707, 13.0827],
  Coimbatore: [76.9558, 11.0168],
  Madurai: [78.1198, 9.9252],
  Tiruchirappalli: [78.7047, 10.7905],
  Salem: [78.146, 11.6643],
  Vellore: [79.1325, 12.9165],
  Thanjavur: [79.1378, 10.787],
  Thoothukudi: [78.1348, 8.7642],
  Kanchipuram: [79.7036, 12.8342],
  Krishnagiri: [78.2137, 12.5266],
  Sivaganga: [78.4809, 9.8433],
  Thiruvallur: [79.912, 13.1231],
  Perambalur: [78.8808, 11.2342],
  Koraput: [82.7101, 18.812],
  "Bengaluru Urban": [77.5946, 12.9716],
};

const STATE_REFERENCE_POINTS: Record<string, Position> = {
  "Tamil Nadu": [78.6569, 11.1271],
  Odisha: [85.0985, 20.9517],
  Karnataka: [75.7139, 15.3173],
};

const DEFAULT_REFERENCE_POINT: Position = [78.6569, 11.1271];

export function districtReferencePoint(state: string, district: string): Position {
  return (
    DISTRICT_REFERENCE_POINTS[district] ??
    STATE_REFERENCE_POINTS[state] ??
    DEFAULT_REFERENCE_POINT
  );
}

/* ── Extent notation ──────────────────────────────────────────────────
 * A patta states extent as hectare.are.centiare ("0.42.5"), not as a
 * decimal — an officer comparing the screen against the paper record is
 * looking for that form. Acres are shown alongside because that is what
 * landowners actually speak in. */

export function formatExtent(hectares: number): string {
  const totalCentiares = Math.round(hectares * 10000);
  const ha = Math.floor(totalCentiares / 10000);
  const are = Math.floor((totalCentiares % 10000) / 100);
  const centiare = totalCentiares % 100;
  const acres = hectares * 2.47105;
  return `${ha}.${String(are).padStart(2, "0")}.${String(centiare).padStart(2, "0")} ha (${acres.toFixed(2)} acres)`;
}
